// 로그인 기능을 붙이기 전까지 채팅 예제에서 사용할 고정 학습 사용자명이다.
// 라우터와 채팅방 목록이 같은 값을 써야 입장 query와 fallback sender가 어긋나지 않는다.
export const STUDY_CHAT_USERNAME = 'study-user'

// 채팅은 일반 사용자가 방을 만들고 입장/퇴장하는 흐름을 학습하는 기능이다.
// 관리자 id(1)는 공지/숨김 같은 운영 액션에 남겨두고, 채팅 REST 요청은 일반 사용자 id(2)로 보낸다.
export const STUDY_CHAT_MEMBER_ID = 2
