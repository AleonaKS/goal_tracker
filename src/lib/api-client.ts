const API_BASE_URL = '/api'

class ApiClient {
  private getAuthHeader() {
    const token = localStorage.getItem('auth_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  private convertMongoId(obj: any): any {
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        return obj.map(item => this.convertMongoId(item))
      }
      
      const converted = { ...obj }
      if (converted._id) {
        converted.id = converted._id
        // Keep _id for compatibility but add id
      }
      return converted
    }
    return obj
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const authHeader = this.getAuthHeader()
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader.Authorization && { Authorization: authHeader.Authorization }),
        ...options.headers,
      } as any,
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return this.convertMongoId(data)
    } catch (error) {
      console.error('API request error:', error)
      throw error
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint)
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()
