package dev.dolphago.member.service

import org.springframework.stereotype.Service

@Service
class NicknameService {

    private val adjectives = listOf(
        "멋진", "빠른", "조용한", "큰", "작은", "새로운", "오래된", "행복한", "슬픈", "화난",
        "재미있는", "똑똑한", "용감한", "친절한", "성실한", "건강한", "강한", "약한", "귀여운",
        "예쁜", "잘생긴", "한가로운", "바쁜", "젊은", "늙은"
    )

    private val nouns = listOf(
        "호랑이", "사자", "고양이", "강아지", "새", "물고기", "나무", "꽃", "하늘", "바다",
        "산", "강", "구름", "별", "달", "해", "돌", "풀", "사람", "자동차",
        "자전거", "배", "비행기", "기차", "버스", "책", "노트북", "핸드폰", "컴퓨터", "모니터"
    )

    fun getRandomNickname(): String {
        val adjective = adjectives.random()
        val noun = nouns.random()
        return "$adjective $noun"
    }
}
