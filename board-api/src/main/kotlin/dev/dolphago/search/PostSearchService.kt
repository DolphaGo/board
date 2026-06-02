package dev.dolphago.search

import co.elastic.clients.elasticsearch._types.query_dsl.FunctionBoostMode
import co.elastic.clients.elasticsearch._types.query_dsl.FunctionScoreMode
import org.springframework.data.domain.PageRequest
import org.springframework.data.elasticsearch.client.elc.NativeQuery
import org.springframework.data.elasticsearch.core.ElasticsearchOperations
import org.springframework.data.elasticsearch.core.query.HighlightQuery
import org.springframework.data.elasticsearch.core.query.highlight.Highlight
import org.springframework.data.elasticsearch.core.query.highlight.HighlightField
import org.springframework.stereotype.Service

data class PostSearchResult(
    val postId: Long,
    val title: String,
    val contentPreview: String,
    val display: Boolean,
    val score: Float,
    val highlights: Map<String, List<String>>,
    val scoringSignals: List<PostSearchScoreSignal> = emptyList(),
    val scoreExplanation: PostSearchScoreExplanation,
)

data class PostSearchScoreExplanation(
    val formula: String,
    val finalScore: Float,
    val appliedSignalCount: Int,
    val totalSignalCount: Int,
    val functionScoreApplied: Boolean,
    val description: String,
) {
    init {
        require(appliedSignalCount >= 0) { "적용 signal 수는 0 이상이어야 합니다." }
        require(totalSignalCount >= 0) { "전체 signal 수는 0 이상이어야 합니다." }
        // 이 DTO는 프론트가 그대로 "적용 n/m개"로 렌더링하는 학습용 계약이다.
        // 여기서 의미적으로 불가능한 값을 막아야 UI와 API 문서가 서로 다른 설명을 하지 않는다.
        require(appliedSignalCount <= totalSignalCount) {
            "적용 signal 수는 전체 signal 수보다 클 수 없습니다."
        }
    }
}

data class PostSearchScoreSignal(
    val field: String,
    val category: String,
    val categoryDescription: String,
    val label: String,
    val boost: Float,
    val keyword: String,
    val description: String,
    val applied: Boolean,
)

@Service
class PostSearchService(
    private val elasticsearchOperations: ElasticsearchOperations,
) {
    fun search(
        rawKeyword: String,
        size: Int,
    ): List<PostSearchResult> {
        val keyword = SearchKeyword.from(rawKeyword)
        val syllableKeyword = KoreanSyllableTokenizer.tokenize(keyword.value)
        val initialKeyword = KoreanSyllableTokenizer.tokenizeInitials(keyword.value)
        val safeSize = size.coerceIn(1, MAX_SEARCH_SIZE)
        val query =
            NativeQuery
                .builder()
                .withQuery { q ->
                    q.functionScore { fs ->
                        fs
                            // function_score는 BM25 같은 텍스트 관련도 점수 위에 운영 점수를 더할 때 쓴다.
                            .query { base ->
                                base.bool { b ->
                                    b
                                        // 제목 일치는 게시판 검색에서 의도가 강하므로 본문보다 높은 boost를 둔다.
                                        .should { s ->
                                            s.match { m ->
                                                m
                                                    .field("title")
                                                    .query(keyword.value)
                                                    .boost(TITLE_MATCH_BOOST)
                                            }
                                        }
                                        // 본문 일치는 recall을 넓히는 용도다. 제목보다 낮은 기본 점수를 준다.
                                        .should { s ->
                                            s.match { m ->
                                                m
                                                    .field("content")
                                                    .query(keyword.value)
                                                    .boost(CONTENT_MATCH_BOOST)
                                            }
                                        }
                                        // 음절 토큰 필드는 오타/초성/부분 기억을 보조하는 recall 장치다.
                                        // 원문 title/content BM25 점수를 누르지 않도록 제목 1.5, 본문 0.5로 낮게 둔다.
                                        .should { s ->
                                            s.match { m ->
                                                m
                                                    .field("titleSyllables")
                                                    .query(syllableKeyword)
                                                    .boost(TITLE_SYLLABLE_BOOST)
                                            }
                                        }
                                        .should { s ->
                                            s.match { m ->
                                                m
                                                    .field("contentSyllables")
                                                    .query(syllableKeyword)
                                                    .boost(CONTENT_SYLLABLE_BOOST)
                                            }
                                        }
                                        // 초성만 입력하는 검색은 원문 BM25 신호가 거의 없으므로 별도 initials 필드가 필요하다.
                                        // 다만 초성은 충돌이 많다. 예: "ㄱㅅ"는 검색, 감사, 게시 모두가 될 수 있어 낮은 boost로 보조한다.
                                        .should { s ->
                                            s.match { m ->
                                                m
                                                    .field("titleInitials")
                                                    .query(initialKeyword)
                                                    .boost(TITLE_INITIAL_BOOST)
                                            }
                                        }
                                        .should { s ->
                                            s.match { m ->
                                                m
                                                    .field("contentInitials")
                                                    .query(initialKeyword)
                                                    .boost(CONTENT_INITIAL_BOOST)
                                            }
                                        }.filter { f ->
                                            f.term { t ->
                                                t.field("display").value(true)
                                            }
                                        }
                                        .minimumShouldMatch("1")
                                }
                            }
                            // 공지는 목록 상단 고정과 별개로 검색 결과에서도 조금 더 잘 보이게 한다.
                            .functions { fn ->
                                fn
                                    .filter { f ->
                                        f.term { t ->
                                            t.field("notice").value(true)
                                        }
                                    }
                                    .weight(NOTICE_SCORE_WEIGHT)
                            }
                            // Sum 모드는 관련도 점수를 대체하지 않고 작은 운영 가산점만 더한다.
                            .scoreMode(FunctionScoreMode.Sum)
                            .boostMode(FunctionBoostMode.Sum)
                    }
                }
                // scoringSignals.applied는 SearchHit.highlightFields에 해당 필드가 있는지로 판단한다.
                // 따라서 쿼리에서 title/content뿐 아니라 음절/초성 보조 필드도 highlight 대상으로 요청해야
                // 화면의 "적용 근거"가 실제 ES 매칭 필드와 일관되게 표시된다.
                .withHighlightQuery(createScoringHighlightQuery())
                .withPageable(PageRequest.of(0, safeSize))
                .build()

        return elasticsearchOperations
            .search(query, PostSearchDocument::class.java)
            .searchHits
            .mapNotNull { hit ->
                val document = hit.content
                val postId = document.id ?: return@mapNotNull null
                if (!document.display) {
                    // ES 쿼리에도 display=true 필터가 있지만, 색인 지연이나 잘못 만든 테스트 문서가 섞일 수 있다.
                    // 사용자에게 돌려주는 마지막 경계에서 한 번 더 거르면 숨김 게시글이 검색 결과로 새는 일을 막을 수 있다.
                    return@mapNotNull null
                }
                val scoringSignals =
                    createScoringSignals(
                        keyword = keyword,
                        syllableKeyword = syllableKeyword,
                        initialKeyword = initialKeyword,
                        notice = document.notice,
                        highlights = hit.highlightFields,
                    )
                PostSearchResult(
                    postId = postId,
                    title = document.title,
                    contentPreview = createContentPreview(document.content),
                    display = document.display,
                    score = hit.score,
                    highlights = createDisplayHighlights(hit.highlightFields),
                    scoringSignals = scoringSignals,
                    scoreExplanation = createScoreExplanation(hit.score, scoringSignals),
                )
            }
    }

    private fun createScoreExplanation(
        finalScore: Float,
        scoringSignals: List<PostSearchScoreSignal>,
    ): PostSearchScoreExplanation {
        val appliedSignals = scoringSignals.filter { it.applied }
        val appliedCategorySummary =
            appliedSignals
                .map { scoreCategoryLabelOf(it.category) }
                .distinct()
                .joinToString(", ")
                .ifBlank { "없음" }

        return PostSearchScoreExplanation(
            formula = "final_score = bm25_text_score + syllable_recall_score + initial_recall_score + function_score_bonus",
            finalScore = finalScore,
            appliedSignalCount = appliedSignals.size,
            totalSignalCount = scoringSignals.size,
            functionScoreApplied = appliedSignals.any { it.category == "FUNCTION_SCORE" },
            // 실제 ES explain API 전체 트리를 그대로 노출하면 너무 길고 버전별 차이가 크다.
            // 학습용 샘플에서는 우리가 구성한 query plan 기준으로 최종 점수의 큰 재료를 먼저 설명한다.
            // 적용 계열 요약은 최종 점수 숫자와 scoringSignals 사이의 연결고리다.
            // 같은 공식이라도 이번 문서가 원문 BM25로 올라왔는지, 음절/초성 recall로 보완됐는지 바로 읽을 수 있다.
            description = "Elasticsearch 최종 점수는 BM25 기반 텍스트 관련도에 음절/초성 recall 신호와 공지 가산점을 더한 값이다. 이번 결과 적용 계열: $appliedCategorySummary.",
        )
    }

    private fun scoreCategoryLabelOf(category: String): String =
        when (category) {
            "BM25_TEXT" -> "원문/BM25"
            "SYLLABLE_RECALL" -> "음절 recall"
            "INITIAL_RECALL" -> "초성 recall"
            "FUNCTION_SCORE" -> "function_score"
            else -> category
        }

    private fun createScoringSignals(
        keyword: SearchKeyword,
        syllableKeyword: String,
        initialKeyword: String,
        notice: Boolean,
        highlights: Map<String, List<String>>,
    ): List<PostSearchScoreSignal> =
        listOf(
            PostSearchScoreSignal(
                field = "title",
                category = "BM25_TEXT",
                categoryDescription = categoryDescriptionOf("BM25_TEXT"),
                label = "제목 원문",
                boost = TITLE_MATCH_BOOST,
                keyword = keyword.value,
                description = "제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.",
                applied = highlights.containsKey("title"),
            ),
            PostSearchScoreSignal(
                field = "content",
                category = "BM25_TEXT",
                categoryDescription = categoryDescriptionOf("BM25_TEXT"),
                label = "본문 원문",
                boost = CONTENT_MATCH_BOOST,
                keyword = keyword.value,
                description = "본문 원문 match는 제목보다 넓은 recall을 담당한다.",
                applied = highlights.containsKey("content"),
            ),
            PostSearchScoreSignal(
                field = "titleSyllables",
                category = "SYLLABLE_RECALL",
                categoryDescription = categoryDescriptionOf("SYLLABLE_RECALL"),
                label = "제목 음절",
                boost = TITLE_SYLLABLE_BOOST,
                keyword = syllableKeyword,
                description = "음절 분해 제목 필드는 한글 부분 기억과 오타성 검색을 보조한다.",
                applied = highlights.containsKey("titleSyllables"),
            ),
            PostSearchScoreSignal(
                field = "contentSyllables",
                category = "SYLLABLE_RECALL",
                categoryDescription = categoryDescriptionOf("SYLLABLE_RECALL"),
                label = "본문 음절",
                boost = CONTENT_SYLLABLE_BOOST,
                keyword = syllableKeyword,
                description = "음절 분해 본문 필드는 넓게 찾되 원문 점수를 넘지 않게 낮게 둔다.",
                applied = highlights.containsKey("contentSyllables"),
            ),
            PostSearchScoreSignal(
                field = "titleInitials",
                category = "INITIAL_RECALL",
                categoryDescription = categoryDescriptionOf("INITIAL_RECALL"),
                label = "제목 초성",
                boost = TITLE_INITIAL_BOOST,
                keyword = initialKeyword,
                description = "제목 초성 필드는 ㅋㅌㄹ 같은 초성 입력을 위한 보조 신호다.",
                applied = highlights.containsKey("titleInitials"),
            ),
            PostSearchScoreSignal(
                field = "contentInitials",
                category = "INITIAL_RECALL",
                categoryDescription = categoryDescriptionOf("INITIAL_RECALL"),
                label = "본문 초성",
                boost = CONTENT_INITIAL_BOOST,
                keyword = initialKeyword,
                description = "본문 초성 필드는 충돌이 많아 가장 낮은 boost로 둔다.",
                applied = highlights.containsKey("contentInitials"),
            ),
            PostSearchScoreSignal(
                field = "notice",
                category = "FUNCTION_SCORE",
                categoryDescription = categoryDescriptionOf("FUNCTION_SCORE"),
                label = "공지 가산점",
                boost = NOTICE_SCORE_WEIGHT.toFloat(),
                keyword = "notice=true",
                description = "공지글은 function_score sum 모드로 관련도 점수에 작은 운영 가산점을 더한다.",
                applied = notice,
            ),
        )

    private fun categoryDescriptionOf(category: String): String =
        when (category) {
            // BM25는 "검색어가 몇 번 나왔는가"만 보지 않는다.
            // 같은 단어가 짧은 제목에 나오면 긴 본문에 한 번 나온 것보다 더 강한 신호가 될 수 있어,
            // title/content 원문 match를 검색 결과의 기본 관련도 계열로 묶는다.
            "BM25_TEXT" -> "BM25는 제목/본문 원문 일치의 기본 관련도입니다."
            // 음절 recall은 사용자가 한글을 완성형 단어로 정확히 기억하지 못할 때를 위한 보조 계열이다.
            // 예를 들어 코프링을 자모 단위로 풀어 색인하면 부분 기억과 일부 오타를 더 넓게 받아낼 수 있다.
            "SYLLABLE_RECALL" -> "음절 recall은 ㅋㅗ처럼 자모로 쪼갠 입력을 보조합니다."
            // 초성 recall은 빠르게 ㅋㅍㄹ처럼 입력하는 게시판 검색 습관을 보조한다.
            // 초성은 충돌이 많기 때문에 원문 BM25보다 낮은 boost로만 점수에 참여시킨다.
            "INITIAL_RECALL" -> "초성 recall은 ㅋㅍㄹ처럼 빠르게 입력한 초성 검색을 보조합니다."
            // function_score는 텍스트 관련도 밖의 운영 신호를 더할 때 사용한다.
            // 이 샘플에서는 공지글을 검색 결과에서도 조금 더 잘 보이게 하되, BM25 관련도를 대체하지 않도록 sum으로 더한다.
            "FUNCTION_SCORE" -> "function_score는 공지 같은 운영 신호를 작은 가산점으로 더합니다."
            else -> "알 수 없는 검색 점수 계열입니다."
        }

    private fun createContentPreview(content: String): String =
        createDisplayText(content)
            .take(CONTENT_PREVIEW_LENGTH)

    private fun createDisplayHighlights(highlights: Map<String, List<String>>): Map<String, List<String>> =
        highlights.mapValues { (_, snippets) ->
            snippets.map(::createDisplayText)
        }

    private fun createScoringHighlightQuery(): HighlightQuery =
        HighlightQuery(
            Highlight(
                listOf(
                    HighlightField("title"),
                    HighlightField("content"),
                    HighlightField("titleSyllables"),
                    HighlightField("contentSyllables"),
                    HighlightField("titleInitials"),
                    HighlightField("contentInitials"),
                ),
            ),
            PostSearchDocument::class.java,
        )

    private fun createDisplayText(content: String): String =
        content
            .replace(MARKDOWN_IMAGE_PATTERN) { matchResult ->
                val altText = matchResult.groupValues[1].trim().ifEmpty { "첨부 이미지" }
                " [이미지: $altText] "
            }.replace(MARKDOWN_LINK_PATTERN) { matchResult ->
                matchResult.groupValues[1]
            }.replace(WHITESPACE_PATTERN, " ")
            .trim()

    companion object {
        private val MARKDOWN_IMAGE_PATTERN = Regex("!\\[([^\\]]*)]\\(([^)]+)\\)")
        private val MARKDOWN_LINK_PATTERN = Regex("(?<!!)\\[([^\\]]+)]\\(([^)]+)\\)")
        private val WHITESPACE_PATTERN = Regex("\\s+")
        private const val MAX_SEARCH_SIZE = 50
        private const val CONTENT_PREVIEW_LENGTH = 120
        private const val NOTICE_SCORE_WEIGHT = 2.0
        private const val TITLE_MATCH_BOOST = 3.0f
        private const val CONTENT_MATCH_BOOST = 1.0f
        private const val TITLE_SYLLABLE_BOOST = 1.5f
        private const val CONTENT_SYLLABLE_BOOST = 0.5f
        private const val TITLE_INITIAL_BOOST = 1.0f
        private const val CONTENT_INITIAL_BOOST = 0.25f
    }
}
