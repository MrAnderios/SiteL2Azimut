import net from 'node:net'

/** true, если удалось установить TCP-соединение с host:port за timeoutMs миллисекунд. */
export function portOpen(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let done = false

    const finish = (open: boolean) => {
      if (done) return
      done = true
      socket.destroy()
      resolve(open)
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
    socket.connect(port, host)
  })
}
