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
  
  export const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  export const formatNumber = (num) => {
    return num.toLocaleString('vi-VN')
  }
  
  export const truncateDomain = (domain, maxLength = 35) => {
    if (domain.length > maxLength) {
      return domain.substring(0, maxLength) + '...'
    }
    return domain
  }