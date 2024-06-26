function disconnect(socket) {
  // Early return if socket is already closed
  if (socket.readyState === WebSocket.CLOSED) return

  // Closing the socket
  socket.close()
  // This adheres to the rule by returning early if the socket is already closed.
}

// Generated by gpt-4-0125-preview
