<template>
  <div class="chat-room-list">
    <div class="header">
      <h2>채팅방 목록</h2>
      <button @click="openCreateRoomDialog" class="create-btn">새 채팅방</button>
    </div>

    <p v-if="feedbackMessage && !showCreateDialog" class="action-feedback" role="status">
      {{ feedbackMessage }}
    </p>

    <div v-if="loading" class="loading">
      로딩 중...
    </div>

    <div v-else-if="error" class="error">
      채팅방 목록을 불러오는데 실패했습니다.
      <button @click="fetchRooms">다시 시도</button>
    </div>

    <div v-else class="room-list">
      <div v-if="rooms.length === 0" class="empty-state" data-testid="chat-empty-state">
        <p>생성된 채팅방이 없습니다.</p>
        <p>새 채팅방 버튼으로 방을 만들면 생성 후 바로 입장합니다.</p>
        <p>목록에서 방을 선택하면 join API로 정원을 다시 확인한 뒤 채팅 화면으로 이동합니다.</p>
      </div>
      <div
        v-for="room in rooms"
        :key="room.id"
        class="room-item"
        :class="{ 'room-item-full': isRoomFull(room) }"
        role="button"
        tabindex="0"
        :aria-disabled="isRoomFull(room)"
        @click="enterRoom(room)"
        @keyup.enter="enterRoom(room)"
        @keyup.space="enterRoom(room)"
      >
        <div class="room-info">
          <h3>{{ room.name }}</h3>
          <p class="participant-count">참여자: {{ room.participantCount }}/{{ room.maxParticipants }}명</p>
          <p class="created-at">{{ formatDate(room.createdAt) }}</p>
        </div>
        <div class="room-action">
          <span v-if="isRoomFull(room)" class="room-status">정원 마감</span>
          <span v-else class="enter-icon">→</span>
        </div>
      </div>
    </div>

    <!-- 채팅방 생성 다이얼로그 -->
    <div v-if="showCreateDialog" class="dialog-overlay">
      <div class="dialog">
        <h3>새 채팅방 만들기</h3>
        <input
          v-model="newRoomName"
          placeholder="채팅방 이름을 입력하세요"
          @keyup.enter="createRoom"
        />
        <textarea
          v-model="newRoomDescription"
          placeholder="채팅방 설명을 입력하세요"
        />
        <label class="field-label" for="new-room-max-participants">최대 참여자 수</label>
        <input
          id="new-room-max-participants"
          v-model.number="newRoomMaxParticipants"
          aria-label="최대 참여자 수"
          type="number"
          min="2"
          max="100"
        />
        <p v-if="feedbackMessage" class="dialog-feedback" role="status">
          {{ feedbackMessage }}
        </p>
        <div class="dialog-actions">
          <button @click="closeCreateRoomDialog" class="cancel-btn">취소</button>
          <button @click="createRoom" :disabled="!newRoomName.trim()" class="confirm-btn">
            만들기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { chatService, type ChatRoom } from 'src/api/chatService'
import { STUDY_CHAT_USERNAME } from 'src/chat/chatStudyConfig'
import { buildCreateRoomRequest } from './createRoomDialogForm'
import { buildChatRoomActionErrorMessage } from './chatRoomListFeedback'

export default defineComponent({
  name: 'ChatRoomList',
  setup() {
    const router = useRouter()
    const rooms = ref<ChatRoom[]>([])
    const loading = ref(true)
    const error = ref(false)
    const showCreateDialog = ref(false)
    const newRoomName = ref('')
    const newRoomDescription = ref('')
    const newRoomMaxParticipants = ref(100)
    const feedbackMessage = ref('')

    const fetchRooms = async () => {
      try {
        loading.value = true
        error.value = false
        feedbackMessage.value = ''
        rooms.value = await chatService.getRoomList()
      } catch (err) {
        console.error('채팅방 목록 조회 실패:', err)
        error.value = true
      } finally {
        loading.value = false
      }
    }

    const isRoomFull = (room: ChatRoom) => room.participantCount >= room.maxParticipants

    const enterRoom = async (room: ChatRoom) => {
      if (isRoomFull(room)) {
        // 서버도 정원을 다시 검사하지만, 목록에서 이미 꽉 찬 방은 프론트에서 먼저 막아 불필요한 요청을 줄인다.
        // 공부 포인트: 프론트 검증은 사용자 경험용이고, 실제 보안/정합성은 백엔드 검증이 최종 책임진다.
        feedbackMessage.value = '정원이 가득 찬 채팅방입니다.'
        return
      }

      try {
        feedbackMessage.value = ''
        await chatService.joinRoom(room.id)
        // 로그인 기능이 붙기 전까지는 학습용 사용자명을 query로 넘겨 ChatRoom의 sender 흐름을 눈에 보이게 둔다.
        // 이후 회원 세션을 붙이면 이 값은 로그인 사용자 닉네임이나 프로필명으로 교체한다.
        router.push({
          path: `/chat/rooms/${room.id}`,
          query: { username: STUDY_CHAT_USERNAME },
        })
      } catch (err) {
        console.error('채팅방 입장 실패:', err)
        feedbackMessage.value = buildChatRoomActionErrorMessage('enter')
        try {
          // 목록은 사용자가 클릭한 순간보다 낡은 스냅샷일 수 있다.
          // 예를 들어 마지막 자리가 다른 사용자에게 먼저 채워지면 서버가 입장을 거부하므로,
          // 실패 직후 한 번 더 조회해 정원 마감 배지와 참여자 수를 최신 상태로 맞춘다.
          rooms.value = await chatService.getRoomList()
        } catch (refreshError) {
          console.error('채팅방 목록 갱신 실패:', refreshError)
        }
      }
    }

    const openCreateRoomDialog = () => {
      showCreateDialog.value = true
      newRoomName.value = ''
      newRoomDescription.value = ''
      newRoomMaxParticipants.value = 100
      feedbackMessage.value = ''
    }

    const closeCreateRoomDialog = () => {
      showCreateDialog.value = false
    }

    const createRoom = async () => {
      if (!newRoomName.value.trim()) {
        // 버튼은 비활성화되어도 Enter 키로 createRoom이 호출될 수 있다.
        // 조용히 무시하면 사용자가 왜 생성되지 않는지 알 수 없으므로 다이얼로그 안에 이유를 보여준다.
        feedbackMessage.value = '채팅방 이름을 입력해주세요.'
        return
      }
      if (newRoomMaxParticipants.value < 2 || newRoomMaxParticipants.value > 100) {
        // 백엔드도 2..100 범위만 허용한다.
        // 브라우저 number input의 min/max만 믿으면 키보드 입력이나 테스트 경로에서 잘못된 값이 API까지 갈 수 있다.
        feedbackMessage.value = '최대 참여자 수는 2명 이상 100명 이하로 입력해주세요.'
        return
      }

      try {
        feedbackMessage.value = ''
        const request = buildCreateRoomRequest({
          name: newRoomName.value,
          description: newRoomDescription.value,
          maxParticipants: newRoomMaxParticipants.value,
        })
        const newRoom = await chatService.createRoom(request.name, request.options)
        await enterRoom(newRoom)
      } catch (err) {
        console.error('채팅방 생성 실패:', err)
        feedbackMessage.value = buildChatRoomActionErrorMessage('create')
      }
    }

    const formatDate = (dateString: string) => {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date)
    }

    onMounted(() => {
      fetchRooms()
    })

    return {
      rooms,
      loading,
      error,
      showCreateDialog,
      newRoomName,
      newRoomDescription,
      newRoomMaxParticipants,
      feedbackMessage,
      fetchRooms,
      enterRoom,
      isRoomFull,
      openCreateRoomDialog,
      closeCreateRoomDialog,
      createRoom,
      formatDate
    }
  }
})
</script>

<style scoped>
.chat-room-list {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.create-btn {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.create-btn:hover {
  background-color: #45a049;
}

.loading, .error, .empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.empty-state p {
  margin: 0 0 8px;
  line-height: 1.5;
}

.empty-state p:last-child {
  margin-bottom: 0;
  color: #777;
  font-size: 0.9em;
}

.action-feedback,
.dialog-feedback {
  padding: 10px 12px;
  border: 1px solid #f2b8b5;
  border-radius: 4px;
  background: #fff4f3;
  color: #9f2f28;
  font-size: 0.9em;
}

.action-feedback {
  margin: 0 0 16px 0;
}

.dialog-feedback {
  margin: 0 0 16px 0;
}

.room-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.room-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.room-item:hover {
  background-color: #f5f5f5;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.room-item-full {
  cursor: not-allowed;
  background-color: #fafafa;
}

.room-item-full:hover {
  transform: none;
  box-shadow: none;
}

.room-info h3 {
  margin: 0 0 8px 0;
  font-size: 1.1em;
}

.participant-count {
  color: #666;
  font-size: 0.9em;
  margin: 0;
}

.created-at {
  color: #999;
  font-size: 0.8em;
  margin: 4px 0 0 0;
}

.enter-icon {
  font-size: 1.5em;
  color: #4CAF50;
}

.room-status {
  padding: 4px 8px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background-color: #f1f1f1;
  color: #666;
  font-size: 0.85em;
  font-weight: bold;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.dialog {
  background: white;
  padding: 24px;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
}

.dialog h3 {
  margin: 0 0 16px 0;
}

.dialog input,
.dialog textarea {
  width: 100%;
  padding: 8px;
  margin-bottom: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.dialog textarea {
  min-height: 72px;
  resize: vertical;
}

.field-label {
  display: block;
  margin-bottom: 6px;
  color: #333;
  font-size: 0.9em;
  font-weight: bold;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-btn, .confirm-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background-color: #f5f5f5;
  color: #333;
}

.confirm-btn {
  background-color: #4CAF50;
  color: white;
}

.confirm-btn:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style> 
