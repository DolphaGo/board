class CustomNetworkError extends Error {
  response: Response

  constructor (name: string, response: Response) {
    super(name)
    this.response = response
  }
}

const applicationErrorCode: Record<string, string> = {
  500: '에러가 발생했습니다.', // xlt
  400: 'validation error',
}

const errorCodeDispatcher = (code) => {
  return applicationErrorCode[code] ?? '에러가 발생했습니다'
}

export class ApplicationError extends Error {
  errorResponse: ErrorResponse

  constructor (errorResponse: ErrorResponse) {
    super(errorCodeDispatcher(errorResponse.code))
    this.errorResponse = errorResponse
  }
}

export class NetworkError extends CustomNetworkError {
  constructor (response: Response) {
    super('NETWORK_ERROR', response)
  }
}

export class AuthorizationError extends CustomNetworkError {
  constructor (response: Response) {
    super('AUTHORIZATION_ERROR', response)
  }
}

export class ValidationError<T extends Partial<Record<string, string[]>>> extends CustomNetworkError {
  constructor (response: Response) {
    super('VALIDATION_ERROR', response)
  }

  getErrors (): Promise<T> {
    return this.response.json().then(json => json.errors as T)
  }
}
