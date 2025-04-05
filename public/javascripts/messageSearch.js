document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('messageSearch');
    if (!searchInput) return;
    
    // Function to perform search
    function performSearch() {
      const searchTerm = searchInput.value.toLowerCase();
      const messageItems = document.querySelectorAll('.list-group-item');
      
      messageItems.forEach(item => {
          const senderName = item.querySelector('h5').textContent.toLowerCase();
          const messageSubject = item.querySelector('.text-muted').textContent.toLowerCase();
          const messageContent = item.querySelector('p').textContent.toLowerCase();
          
          // Show/hide based on search term
          if (senderName.includes(searchTerm) || 
              messageSubject.includes(searchTerm) || 
              messageContent.includes(searchTerm)) {
              item.style.display = '';
          } else {
              item.style.display = 'none';
          }
      });
    }
    
    // Search on keyup
    searchInput.addEventListener('keyup', performSearch);
    
    // Make search button functional (clear search and reset display)
    const searchButton = document.querySelector('.btn-outline-secondary');
    if (searchButton) {
      searchButton.addEventListener('click', function() {
        searchInput.value = '';
        
        // Show all items again
        const messageItems = document.querySelectorAll('.list-group-item');
        messageItems.forEach(item => {
          item.style.display = '';
        });
        
        // Focus back on the search input
        searchInput.focus();
      });
    }
  });