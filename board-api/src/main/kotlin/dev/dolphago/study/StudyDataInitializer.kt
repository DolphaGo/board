package dev.dolphago.study

import dev.dolphago.member.repository.MemberRepository
import dev.dolphago.mysql.Authority
import dev.dolphago.mysql.Member
import dev.dolphago.mysql.Post
import dev.dolphago.post.repository.PostRepository
import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Profile
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional

@Component
@Profile("study & !prod")
class StudyDataInitializer(
    private val memberRepository: MemberRepository,
    private val postRepository: PostRepository,
) : CommandLineRunner {
    @Transactional
    override fun run(vararg args: String) {
        // 기존 데이터와 섞이면 학습용 회원 번호가 달라지므로 저장소가 비어 있을 때만 준비한다.
        if (memberRepository.count() > 0 || postRepository.count() > 0) {
            return
        }

        // 빈 학습 DB에서 이 순서로 저장하면 UI의 관리자 1번, 일반 회원 2번과 일치한다.
        val admin =
            memberRepository.save(
                Member(
                    email = "admin@study.example",
                    nickname = "학습 관리자",
                    role = Authority.ROLE_ADMIN,
                ),
            )
        val member =
            memberRepository.save(
                Member(
                    email = "member@study.example",
                    nickname = "학습 회원",
                    role = Authority.ROLE_USER,
                ),
            )

        // 목록 학습은 DB 조회만 필요하므로 검색 색인을 호출하는 PostService를 거치지 않는다.
        postRepository.save(
            Post(
                member = admin,
                title = "학습 게시판 이용 안내",
                content = "공지 우선 정렬과 페이지 이동을 실제 API 응답으로 확인해 보세요.",
                viewCount = 0,
                display = true,
                notice = true,
            ),
        )
        (1..12).forEach { number ->
            postRepository.save(
                Post(
                    member = member,
                    title =
                        if (number == 12) {
                            "긴 제목 학습 예시: 모바일과 데스크톱에서 게시글 제목이 여러 줄로 이어져도 작성자와 조회수 및 페이지 이동 버튼을 가리지 않고 화면 너비 안에서 자연스럽게 표시되는지 확인합니다"
                        } else {
                            "학습 게시글 $number: 페이지를 이동하며 목록을 확인합니다"
                        },
                    content = "실제 H2 저장소에서 읽는 $number 번째 일반 게시글입니다.",
                    viewCount = 0,
                    display = true,
                ),
            )
        }
        postRepository.save(
            Post(
                member = member,
                title = "공개 목록에서 제외되는 숨김 게시글",
                content = "숨김 글이 목록의 항목과 전체 개수에서 제외되는지 확인합니다.",
                viewCount = 0,
                display = false,
            ),
        )
    }
}
