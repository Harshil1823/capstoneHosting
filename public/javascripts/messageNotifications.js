// This script handles real-time message notifications
document.addEventListener('DOMContentLoaded', function() {
  // Check for new messages every 60 seconds
  function checkNewMessages() {
      fetch('/messages/check-new')
          .then(response => response.json())
          .then(data => {
              // Update the message count in the navbar
              const badge = document.getElementById('message-badge');
              if (badge) {
                  if (data.unreadCount > 0) {
                      badge.textContent = data.unreadCount;
                      badge.classList.remove('d-none');
                      
                      // Optional: Show notification for new messages
                      if (data.newMessages && data.newMessages.length > 0) {
                          showNotification(data.newMessages[0]);
                      }
                  } else {
                      badge.classList.add('d-none');
                  }
              }
          })
          .catch(error => console.error('Error checking messages:', error));
  }
  
  // Show a browser notification for new messages
  function showNotification(message) {
      // Check if browser notifications are supported and permitted
      if ('Notification' in window && Notification.permission === 'granted') {
          const notification = new Notification('New Message', {
              body: `From: ${message.senderName}\nSubject: ${message.subject}`,
              icon: '/images/message-icon.png' // Add an icon to your public/images folder
          });
          
          notification.onclick = function() {
              window.focus();
              window.location.href = `/messages/${message.threadId}`;
          };
      }
      // Request permission if not already granted
      else if ('Notification' in window && Notification.permission !== 'denied') {
          Notification.requestPermission();
      }
  }
  
  // If the user is logged in (check for the presence of the message badge)
  if (document.getElementById('message-badge')) {
      // Initial check
      checkNewMessages();
      
      // Set interval for checking (every 60 seconds)
      setInterval(checkNewMessages, 60000);
  }
});