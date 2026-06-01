<template>
  <div class="chat-room-list">
    <div class="header">
      <h2>채팅방 목록</h2>
      <button @click="openCreateRoomDialog" class="create-btn">새 채팅방</button>
    </div>

    <div v-if="loading" class="loading">
      로딩 중...
    </div>

    <div v-else-if="error" class="error">
      채팅방 목록을 불러오는데 실패했습니다.
      <button @click="fetchRooms">다시 시도</button>
    </div>

    <div v-else class="room-list">
      <div v-if="rooms.length === 0" class="empty-state">
        생성된 채팅방이 없습니다.
      </div>
      <div
        v-for="room in rooms"
        :key="room.id"
        class="room-item"
        @click="enterRoom(room.id)"
      >
        <div class="room-info">
          <h3>{{ room.name }}</h3>
          <p class="participant-count">참여자: {{ room.participantCount }}명</p>
          <p class="created-at">{{ formatDate(room.createdAt) }}</p>
        </div>
        <div class="room-action">
          <span class="enter-icon">→</span>
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
import { buildCreateRoomRequest } from './createRoomDialogForm'

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

    const fetchRooms = async () => {
      try {
        loading.value = true
        error.value = false
        rooms.value = await chatService.getRoomList()
      } catch (err) {
        console.error('채팅방 목록 조회 실패:', err)
        error.value = true
      } finally {
        loading.value = false
      }
    }

    const enterRoom = async (roomId: string) => {
      try {
        await chatService.joinRoom(roomId)
        router.push(`/chat/rooms/${roomId}`)
      } catch (err) {
        console.error('채팅방 입장 실패:', err)
        alert('채팅방 입장에 실패했습니다.')
      }
    }

    const openCreateRoomDialog = () => {
      showCreateDialog.value = true
      newRoomName.value = ''
      newRoomDescription.value = ''
      newRoomMaxParticipants.value = 100
    }

    const closeCreateRoomDialog = () => {
      showCreateDialog.value = false
    }

    const createRoom = async () => {
      if (!newRoomName.value.trim()) return

      try {
        const request = buildCreateRoomRequest({
          name: newRoomName.value,
          description: newRoomDescription.value,
          maxParticipants: newRoomMaxParticipants.value,
        })
        const newRoom = await chatService.createRoom(request.name, request.options)
        await enterRoom(newRoom.id)
      } catch (err) {
        console.error('채팅방 생성 실패:', err)
        alert('채팅방 생성에 실패했습니다.')
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
      fetchRooms,
      enterRoom,
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
