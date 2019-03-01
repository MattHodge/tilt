// A Websocket that automatically retries.

class AppController {
  /**
   * @param url The url of the websocket to pull data from
   * @param component The top-level component for the app.
   *     Has one method, setAppState, that sets the global state of the
   *     app. This state has two properties
   *     - Message (string): A status message about the state of the socket
   *     - View (Object): A JSON serialization of the Go struct in internal/renderer/view
   */
  constructor(url, component) {
    if (!component.setAppState) {
      throw new Error('App component has no setAppState method')
    }

    this.url = url
    this.component = component
    this.tryConnectCount = 0
    this.liveSocket = false
    this.loadCount = 0
  }

  createNewSocket() {
    this.tryConnectCount++
    this.socket = new WebSocket(this.url)
    this.socket.addEventListener('close', this.onSocketClose.bind(this))
    this.socket.addEventListener('message', (event) => {
      if (!this.liveSocket) {
        this.loadCount++
      }
      this.liveSocket = true
      this.tryConnectCount = 0

      let data = JSON.parse(event.data)
      this.component.setAppState({View: data})
    })
  }

  dispose() {
    this.disposed = true
    this.socket.close()
  }

  onSocketClose() {
    let wasAlive = this.liveSocket
    this.liveSocket = false
    if (this.disposed) {
      return
    }

    if (wasAlive) {
      this.component.setAppState({View: null, Message: 'Disconnected…'})
      this.createNewSocket()
      return
    }

    let timeout = Math.pow(2, this.tryConnectCount) * 1000
    let maxTimeout = 5 * 1000 // 5sec
    setTimeout(() => {
      let message = this.loadCount ? 'Reconnecting…' : 'Loading…'
      this.component.setAppState({View: null, Message: message})
      this.createNewSocket()
    }, Math.min(maxTimeout, timeout))
  }
}

export default AppController
