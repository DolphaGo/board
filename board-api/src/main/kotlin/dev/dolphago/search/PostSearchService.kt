package dev.dolphago.search

import co.elastic.clients.elasticsearch._types.query_dsl.FunctionBoostMode
import co.elastic.clients.elasticsearch._types.query_dsl.FunctionScoreMode
import org.springframework.data.domain.PageRequest
import org.springframework.data.elasticsearch.client.elc.NativeQuery
import org.springframework.data.elasticsearch.core.ElasticsearchOperations
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
)

data class PostSearchScoreSignal(
    val field: String,
    val category: String,
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
                }.withPageable(PageRequest.of(0, safeSize))
                .build()

        return elasticsearchOperations
            .search(query, PostSearchDocument::class.java)
            .searchHits
            .mapNotNull { hit ->
                val document = hit.content
                val postId = document.id ?: return@mapNotNull null
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

        return PostSearchScoreExplanation(
            formula = "final_score = bm25_text_score + syllable_recall_score + initial_recall_score + function_score_bonus",
            finalScore = finalScore,
            appliedSignalCount = appliedSignals.size,
            totalSignalCount = scoringSignals.size,
            functionScoreApplied = appliedSignals.any { it.category == "FUNCTION_SCORE" },
            // 실제 ES explain API 전체 트리를 그대로 노출하면 너무 길고 버전별 차이가 크다.
            // 학습용 샘플에서는 우리가 구성한 query plan 기준으로 최종 점수의 큰 재료를 먼저 설명한다.
            description = "Elasticsearch 최종 점수는 BM25 기반 텍스트 관련도에 음절/초성 recall 신호와 공지 가산점을 더한 값이다.",
        )
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
                label = "제목 원문",
                boost = TITLE_MATCH_BOOST,
                keyword = keyword.value,
                description = "제목 원문 match는 사용자의 의도와 가장 가까운 BM25 신호다.",
                applied = highlights.containsKey("title"),
            ),
            PostSearchScoreSignal(
                field = "content",
                category = "BM25_TEXT",
                label = "본문 원문",
                boost = CONTENT_MATCH_BOOST,
                keyword = keyword.value,
                description = "본문 원문 match는 제목보다 넓은 recall을 담당한다.",
                applied = highlights.containsKey("content"),
            ),
            PostSearchScoreSignal(
                field = "titleSyllables",
                category = "SYLLABLE_RECALL",
                label = "제목 음절",
                boost = TITLE_SYLLABLE_BOOST,
                keyword = syllableKeyword,
                description = "음절 분해 제목 필드는 한글 부분 기억과 오타성 검색을 보조한다.",
                applied = highlights.containsKey("titleSyllables"),
            ),
            PostSearchScoreSignal(
                field = "contentSyllables",
                category = "SYLLABLE_RECALL",
                label = "본문 음절",
                boost = CONTENT_SYLLABLE_BOOST,
                keyword = syllableKeyword,
                description = "음절 분해 본문 필드는 넓게 찾되 원문 점수를 넘지 않게 낮게 둔다.",
                applied = highlights.containsKey("contentSyllables"),
            ),
            PostSearchScoreSignal(
                field = "titleInitials",
                category = "INITIAL_RECALL",
                label = "제목 초성",
                boost = TITLE_INITIAL_BOOST,
                keyword = initialKeyword,
                description = "제목 초성 필드는 ㅋㅌㄹ 같은 초성 입력을 위한 보조 신호다.",
                applied = highlights.containsKey("titleInitials"),
            ),
            PostSearchScoreSignal(
                field = "contentInitials",
                category = "INITIAL_RECALL",
                label = "본문 초성",
                boost = CONTENT_INITIAL_BOOST,
                keyword = initialKeyword,
                description = "본문 초성 필드는 충돌이 많아 가장 낮은 boost로 둔다.",
                applied = highlights.containsKey("contentInitials"),
            ),
            PostSearchScoreSignal(
                field = "notice",
                category = "FUNCTION_SCORE",
                label = "공지 가산점",
                boost = NOTICE_SCORE_WEIGHT.toFloat(),
                keyword = "notice=true",
                description = "공지글은 function_score sum 모드로 관련도 점수에 작은 운영 가산점을 더한다.",
                applied = notice,
            ),
        )

    private fun createContentPreview(content: String): String =
        createDisplayText(content)
            .take(CONTENT_PREVIEW_LENGTH)

    private fun createDisplayHighlights(highlights: Map<String, List<String>>): Map<String, List<String>> =
        highlights.mapValues { (_, snippets) ->
            snippets.map(::createDisplayText)
        }

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
