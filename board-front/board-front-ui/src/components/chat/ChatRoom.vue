<template>
  <div class="chat-container">
    <div class="chat-header">
      <div class="chat-room-summary">
        <h2 data-testid="chat-room-title">{{ room?.name || '채팅방' }}</h2>
        <p v-if="room" class="chat-room-meta" data-testid="chat-room-participants">
          참여자: {{ room.participantCount }}/{{ room.maxParticipants }}명
        </p>
        <p v-if="room?.description" class="chat-room-description" data-testid="chat-room-description">
          {{ room.description }}
        </p>
        <p
          v-if="room && room.participants.length > 0"
          class="chat-room-participant-list"
          data-testid="chat-room-participant-list"
        >
          참여자 ID: {{ formatParticipantIds(room.participants) }}
        </p>
        <p v-if="roomDetailFeedback" class="chat-room-detail-feedback" data-testid="chat-room-detail-feedback">
          {{ roomDetailFeedback }}
        </p>
      </div>
      <button class="leave-room-btn" @click="leaveRoomAndGoToList">나가기</button>
    </div>
    
    <div class="chat-main">
      <p v-if="connectionFeedback" class="connection-feedback" role="status">
        <span class="connection-feedback-kind" data-testid="connection-feedback-kind">
          {{ connectionFeedbackKind }}
        </span>
        {{ connectionFeedback }}
      </p>
      <div class="video-container" v-if="isVideoEnabled">
        <video ref="localVideo" autoplay muted></video>
        <video ref="remoteVideo" autoplay></video>
      </div>
      
      <div class="message-container" ref="messageContainer">
        <div v-for="(message, index) in messages" :key="index" :class="['message', message.sender === username ? 'sent' : 'received']">
          <div class="message-content">
            <span class="sender">{{ message.sender }}</span>
            <p>{{ message.content }}</p>
            <span class="timestamp">{{ formatTime(message.timestamp) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-controls">
      <div class="media-controls" v-if="isVideoEnabled">
        <button @click="toggleVideo" :class="{ active: isVideoOn }">
          <i class="fas" :class="isVideoOn ? 'fa-video' : 'fa-video-slash'"></i>
        </button>
        <button @click="toggleAudio" :class="{ active: isAudioOn }">
          <i class="fas" :class="isAudioOn ? 'fa-microphone' : 'fa-microphone-slash'"></i>
        </button>
      </div>
      
      <div class="message-input">
        <input
          v-model="newMessage"
          @keyup.enter="sendTalkMessage"
          placeholder="메시지를 입력하세요..."
        />
        <button @click="sendTalkMessage">전송</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import dayjs from 'dayjs'
import { chatService, type ChatRoom } from 'src/api/chatService'

interface ChatMessage {
  type: 'ENTER' | 'TALK' | 'LEAVE' | 'SIGNAL'
  roomId: string
  sender: string
  content?: string
  timestamp: Date
}

const CHAT_MESSAGE_TYPES = ['ENTER', 'TALK', 'LEAVE', 'SIGNAL'] as const

export default defineComponent({
  name: 'ChatRoom',
  props: {
    roomId: {
      type: String,
      required: true
    },
    username: {
      type: String,
      required: true
    },
    isVideoEnabled: {
      type: Boolean,
      default: true
    }
  },
  setup(props) {
    const router = useRouter()
    const stompClient = ref<Client | null>(null)
    const room = ref<ChatRoom | null>(null)
    const roomDetailFeedback = ref('')
    const messages = ref<ChatMessage[]>([])
    const newMessage = ref('')
    const connectionFeedback = ref('')
    const connectionFeedbackKind = ref('')
    const messageContainer = ref<HTMLElement | null>(null)
    let isUnmounted = false
    let hasLeftRoom = false
    let hasClosedRealtimeConnection = false
    
    // WebRTC 관련 상태
    const localVideo = ref<HTMLVideoElement | null>(null)
    const remoteVideo = ref<HTMLVideoElement | null>(null)
    const localStream = ref<MediaStream | null>(null)
    const peerConnection = ref<RTCPeerConnection | null>(null)
    const isVideoOn = ref(true)
    const isAudioOn = ref(true)

    const connectWebSocket = () => {
      const socket = new SockJS('http://localhost:8080/ws')
      stompClient.value = new Client({
        webSocketFactory: () => socket,
        debug: (str) => {
          console.log(str)
        }
      })

      stompClient.value.onConnect = () => {
        connectionFeedback.value = ''
        connectionFeedbackKind.value = ''
        stompClient.value?.subscribe(`/topic/chat/${props.roomId}`, (message) => {
          const chatMessage = parseIncomingMessage(message.body)
          if (!chatMessage) {
            return
          }

          messages.value.push(chatMessage)
          scrollToBottom()
        })

        // 입장 메시지 전송
        sendMessage('ENTER')
      }

      stompClient.value.onStompError = () => {
        // WebSocket/STOMP는 HTTP 요청처럼 버튼 클릭 하나에 바로 실패가 보이지 않는다.
        // broker 오류를 화면 상태로 바꿔두면 사용자가 "전송이 안 되는 이유"를 빠르게 알 수 있다.
        connectionFeedbackKind.value = '연결 문제'
        connectionFeedback.value = '채팅 서버 연결에 문제가 생겼습니다. 새로고침하거나 잠시 후 다시 시도해주세요.'
      }

      stompClient.value.activate()
    }

    const fetchRoomDetail = async () => {
      try {
        roomDetailFeedback.value = ''
        room.value = await chatService.getRoom(props.roomId)
      } catch (error) {
        console.error('채팅방 정보 조회 실패:', error)
        // 상세 정보 조회는 제목/정원 표시용이고, 메시지 송수신은 STOMP 연결로 별도 동작한다.
        // 공부 포인트: 부가 정보 API 실패가 핵심 채팅 기능까지 막지 않도록 실패 범위를 좁힌다.
        room.value = null
        roomDetailFeedback.value = '채팅방 정보를 불러오지 못했습니다. 메시지는 계속 보낼 수 있습니다.'
      }
    }

    const parseIncomingMessage = (body: string): ChatMessage | null => {
      try {
        const message = JSON.parse(body)

        if (!isChatMessage(message)) {
          console.warn('필수 필드가 없는 채팅 메시지를 무시했습니다:', message)
          return null
        }

        if (!CHAT_MESSAGE_TYPES.includes(message.type)) {
          console.warn('지원하지 않는 채팅 타입을 무시했습니다:', message.type)
          return null
        }

        // 서버는 /topic/chat/{roomId}로 방을 나눠 보내지만, 클라이언트도 payload를 한 번 더 확인한다.
        // 공부 포인트: 네트워크 경계에서는 라우팅이 맞다는 가정만 믿지 말고 화면에 넣기 전에도 검증한다.
        if (message.roomId !== props.roomId) {
          return null
        }

        return message
      } catch (error) {
        // WebSocket은 외부 입력 경계이므로 malformed payload가 와도 화면 전체가 깨지면 안 된다.
        // 공부 포인트: 신뢰할 수 없는 입력은 파싱 지점에서 좁게 막고, 렌더링 상태는 그대로 둔다.
        console.warn('잘못된 채팅 메시지를 무시했습니다:', error)
        return null
      }
    }

    const isChatMessage = (value: unknown): value is ChatMessage => {
      if (!value || typeof value !== 'object') {
        return false
      }

      const message = value as Partial<ChatMessage>

      // 화면 렌더링과 구분 class 계산에 바로 쓰는 최소 필드만 검증한다.
      // timestamp/content는 서버가 생략할 수 있어도 현재 화면은 기본 포맷으로 처리할 수 있다.
      return typeof message.type === 'string'
        && typeof message.roomId === 'string'
        && typeof message.sender === 'string'
    }

    const sendMessage = (type: 'ENTER' | 'TALK' | 'LEAVE' = 'TALK') => {
      if (!stompClient.value?.connected) return
      
      const chatMessage: ChatMessage = {
        type,
        roomId: props.roomId,
        sender: props.username,
        content: type === 'TALK' ? newMessage.value : `${props.username}님이 ${type === 'ENTER' ? '입장' : '퇴장'}하셨습니다.`,
        timestamp: new Date()
      }
      // ENTER는 백엔드가 WebSocket 세션에 username을 저장해야 하므로 addUser 매핑으로 보낸다.
      // TALK/LEAVE는 세션 저장 없이 방 topic으로 발행하면 충분해서 sendMessage 매핑을 사용한다.
      const destination = type === 'ENTER' ? '/app/chat.addUser' : '/app/chat.sendMessage'

      try {
        stompClient.value.publish({
          destination,
          body: JSON.stringify(chatMessage)
        })
      } catch (error) {
        console.error('채팅 메시지 전송 실패:', error)
        if (type === 'TALK') {
          // publish()가 실패했을 때 입력값까지 지우면 사용자는 같은 메시지를 다시 작성해야 한다.
          // 전송 성공을 확인한 뒤에만 입력을 비우는 구조가 채팅 UX에서는 더 안전하다.
          connectionFeedbackKind.value = '전송 실패'
          connectionFeedback.value = '메시지 전송에 실패했습니다. 연결 상태를 확인한 뒤 다시 시도해주세요.'
        }
        return
      }

      if (type === 'TALK') {
        connectionFeedback.value = ''
        connectionFeedbackKind.value = ''
        newMessage.value = ''
      }
    }

    const sendTalkMessage = () => {
      // Vue 템플릿 이벤트 핸들러에는 KeyboardEvent/MouseEvent가 전달될 수 있다.
      // STOMP 메시지 타입과 DOM 이벤트 객체가 섞이지 않도록 화면 이벤트용 래퍼를 둔다.
      if (!newMessage.value.trim()) {
        return
      }

      sendMessage('TALK')
    }

    const scrollToBottom = () => {
      setTimeout(() => {
        if (messageContainer.value) {
          messageContainer.value.scrollTop = messageContainer.value.scrollHeight
        }
      }, 50)
    }

    const formatTime = (timestamp: Date) => {
      return dayjs(timestamp).format('HH:mm')
    }

    const formatParticipantIds = (participants: number[]) => {
      // 지금 백엔드 ChatRoom은 참가자를 Member id Set으로 내려준다.
      // 학습 단계에서는 이 id를 그대로 보여줘 REST join/leave 결과가 화면에 반영되는지 추적한다.
      return participants.map(participantId => `#${participantId}`).join(', ')
    }

    const leaveRoomOnce = async () => {
      if (hasLeftRoom) {
        return
      }

      hasLeftRoom = true
      try {
        await chatService.leaveRoom(props.roomId)
      } catch (error) {
        console.error('채팅방 나가기 실패:', error)
      }
    }

    const closeRealtimeConnection = () => {
      if (hasClosedRealtimeConnection) {
        return
      }

      hasClosedRealtimeConnection = true
      if (stompClient.value?.connected) {
        sendMessage('LEAVE')
        stompClient.value.deactivate()
      }
    }

    const leaveRoomAndGoToList = async () => {
      // 버튼으로 나갈 때는 REST 참가자 목록 정리를 먼저 시도하고 목록으로 이동한다.
      // 라우터 이동 뒤 unmount가 다시 실행되므로 leaveRoomOnce()가 중복 REST 요청을 막는다.
      await leaveRoomOnce()
      closeRealtimeConnection()
      await router.push('/chat/rooms')
    }

    // WebRTC 관련 함수들
    const stopMediaStream = (stream: MediaStream) => {
      stream.getTracks().forEach(track => track.stop())
    }

    const initializeWebRTC = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        })

        // getUserMedia()는 사용자 권한 확인 때문에 늦게 끝날 수 있다.
        // 그 사이 화면을 떠났다면 ref에 보관하지 말고 즉시 track을 정리해야 카메라/마이크가 새지 않는다.
        if (isUnmounted) {
          stopMediaStream(stream)
          return
        }

        localStream.value = stream
        
        if (localVideo.value) {
          localVideo.value.srcObject = localStream.value
        }

        peerConnection.value = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        })

        localStream.value.getTracks().forEach(track => {
          if (peerConnection.value && localStream.value) {
            peerConnection.value.addTrack(track, localStream.value)
          }
        })

        peerConnection.value.ontrack = (event) => {
          if (remoteVideo.value) {
            remoteVideo.value.srcObject = event.streams[0]
          }
        }
      } catch (error) {
        console.error('미디어 장치 초기화 실패:', error)
      }
    }

    const toggleVideo = () => {
      if (localStream.value) {
        const videoTrack = localStream.value.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled
          isVideoOn.value = videoTrack.enabled
        }
      }
    }

    const toggleAudio = () => {
      if (localStream.value) {
        const audioTrack = localStream.value.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled
          isAudioOn.value = audioTrack.enabled
        }
      }
    }

    onMounted(() => {
      fetchRoomDetail()
      connectWebSocket()
      if (props.isVideoEnabled) {
        initializeWebRTC()
      }
    })

    onUnmounted(() => {
      isUnmounted = true

      // STOMP 퇴장 메시지는 채팅 로그용이고, REST leaveRoom은 서버의 참가자 목록 정리용이다.
      // 화면을 떠나는 중인 요청이므로 await하지 않고 실패만 기록해 unmount 흐름을 막지 않는다.
      void leaveRoomOnce()

      closeRealtimeConnection()
      
      if (localStream.value) {
        stopMediaStream(localStream.value)
      }
      
      if (peerConnection.value) {
        peerConnection.value.close()
      }
    })

    return {
      room,
      roomDetailFeedback,
      messages,
      newMessage,
      connectionFeedback,
      connectionFeedbackKind,
      sendTalkMessage,
      leaveRoomAndGoToList,
      messageContainer,
      formatTime,
      formatParticipantIds,
      localVideo,
      remoteVideo,
      isVideoOn,
      isAudioOn,
      toggleVideo,
      toggleAudio
    }
  }
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.chat-header {
  padding: 1rem;
  background: #4a90e2;
  color: white;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.chat-room-summary {
  min-width: 0;
}

.chat-room-summary h2 {
  margin: 0;
}

.chat-room-meta,
.chat-room-description,
.chat-room-participant-list,
.chat-room-detail-feedback {
  margin: 4px 0 0 0;
  font-size: 0.85rem;
  opacity: 0.9;
}

.leave-room-btn {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: 4px;
  background: transparent;
  color: white;
  cursor: pointer;
  font-weight: bold;
}

.leave-room-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.connection-feedback {
  margin: 12px 16px 0 16px;
  padding: 10px 12px;
  border: 1px solid #f2b8b5;
  border-radius: 4px;
  background: #fff4f3;
  color: #9f2f28;
  font-size: 0.9rem;
}

.connection-feedback-kind {
  margin-right: 6px;
  font-weight: 700;
}

.video-container {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  background: #f5f5f5;
}

.video-container video {
  width: 320px;
  height: 240px;
  background: #000;
  border-radius: 4px;
}

.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  margin-bottom: 1rem;
  max-width: 70%;
}

.message.sent {
  margin-left: auto;
}

.message-content {
  padding: 0.5rem 1rem;
  border-radius: 1rem;
  background: #f0f0f0;
}

.message.sent .message-content {
  background: #4a90e2;
  color: white;
}

.sender {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.2rem;
}

.message.sent .sender {
  color: #fff;
}

.timestamp {
  font-size: 0.7rem;
  color: #999;
  margin-top: 0.2rem;
}

.chat-controls {
  padding: 1rem;
  border-top: 1px solid #eee;
}

.media-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.media-controls button {
  padding: 0.5rem;
  border-radius: 50%;
  border: none;
  background: #f0f0f0;
  cursor: pointer;
}

.media-controls button.active {
  background: #4a90e2;
  color: white;
}

.message-input {
  display: flex;
  gap: 0.5rem;
}

.message-input input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.message-input button {
  padding: 0.5rem 1rem;
  background: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.message-input button:hover {
  background: #357abd;
}
</style> 
