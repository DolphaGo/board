export interface CreateRoomDialogValues {
  name: string
  description: string
  maxParticipants: number
}

export interface CreateRoomRequest {
  name: string
  options: {
    description: string | null
    maxParticipants: number
  }
}

export const buildCreateRoomRequest = (values: CreateRoomDialogValues): CreateRoomRequest => {
  const name = values.name.trim()
  const description = values.description.trim()

  return {
    name,
    options: {
      // 빈 문자열 대신 null을 보내면 백엔드에서 "설명 없음"을 한 가지 값으로 다룰 수 있다.
      description: description === '' ? null : description,
      maxParticipants: values.maxParticipants,
    },
  }
}
