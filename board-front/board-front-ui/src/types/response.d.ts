declare interface ResponseDto<T> {
  success: boolean
  result: T
  error?: ErrorResponse
}

declare interface ErrorResponse {
  code?: string
  message?: string
  reasons?: Record<string, string>
}

declare interface RateOrAmount {
  type: 'RATE' | 'AMOUNT'
  value: number
}

declare interface PageResponse<T> {
  content: T[]
  'number'?: number
  totalPages: number
  totalElements: number
}
