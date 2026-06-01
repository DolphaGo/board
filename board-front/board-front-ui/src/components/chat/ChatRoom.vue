<template>
  <div class="chat-container">
    <div class="chat-header">
      <h2>채팅방</h2>
    </div>
    
    <div class="chat-main">
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
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import dayjs from 'dayjs'

interface ChatMessage {
  type: 'ENTER' | 'TALK' | 'LEAVE' | 'SIGNAL'
  roomId: string
  sender: string
  content?: string
  timestamp: Date
}

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
    const stompClient = ref<Client | null>(null)
    const messages = ref<ChatMessage[]>([])
    const newMessage = ref('')
    const messageContainer = ref<HTMLElement | null>(null)
    let isUnmounted = false
    
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
        stompClient.value?.subscribe('/topic/public', (message) => {
          const chatMessage = JSON.parse(message.body)
          messages.value.push(chatMessage)
          scrollToBottom()
        })

        // 입장 메시지 전송
        sendMessage('ENTER')
      }

      stompClient.value.activate()
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

      stompClient.value.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(chatMessage)
      })

      if (type === 'TALK') {
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
      connectWebSocket()
      if (props.isVideoEnabled) {
        initializeWebRTC()
      }
    })

    onUnmounted(() => {
      isUnmounted = true

      if (stompClient.value?.connected) {
        sendMessage('LEAVE')
        stompClient.value.deactivate()
      }
      
      if (localStream.value) {
        stopMediaStream(localStream.value)
      }
      
      if (peerConnection.value) {
        peerConnection.value.close()
      }
    })

    return {
      messages,
      newMessage,
      sendTalkMessage,
      messageContainer,
      formatTime,
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
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
