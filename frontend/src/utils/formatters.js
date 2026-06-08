export const formatDuration = (seconds) => {
  if (seconds < 1) {
    return (seconds * 1000).toFixed(0) + 'ms'
  } else if (seconds < 10) {
    return seconds.toFixed(1) + 's'
  } else if (seconds < 60) {
    return seconds.toFixed(0) + 's'
  } else {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = (seconds % 60).toFixed(0)
    return `${minutes}m ${remainingSeconds}s`
  }
}
