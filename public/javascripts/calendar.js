// Wait for the DOM to be fully loaded before executing the script
document.addEventListener('DOMContentLoaded', () => {
  // Get the element containing the schedules data
  const schedulesDataElement = document.getElementById('schedulesData');
  if (schedulesDataElement) {
    // Parse the schedules data from the element's text content
    const schedules = JSON.parse(schedulesDataElement.textContent);
    let currentDate = new Date();
    
    // Function to render the calendar for a given date
    function renderCalendar(date) {
      const monthYear = document.getElementById('monthYear');
      const calendarBody = document.getElementById('calendarBody');
      const month = date.getMonth();
      const year = date.getFullYear();

      // Set the month and year in the calendar header
      monthYear.textContent = `${date.toLocaleString('default', { month: 'long' })} ${year}`;

      // Get the first day of the month and the number of days in the month
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Clear the calendar body
      calendarBody.innerHTML = '';
      let row = document.createElement('tr');

      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDay; i++) {
        row.appendChild(document.createElement('td'));
      }

      // Add cells for each day of the month
      for (let day = 1; day <= daysInMonth; day++) {
        // If the row is full (7 days), append it to the calendar body and create a new row
        if (row.children.length === 7) {
          calendarBody.appendChild(row);
          row = document.createElement('tr');
        }

        const cell = document.createElement('td');
        cell.textContent = day;

        const cellDate = new Date(year, month, day);

        // Find the schedule for the current cell date
        const schedule = schedules.find(s => {
          return Object.values(s.days).some(d => {
            const scheduleDate = new Date(d.date);
            return scheduleDate.getFullYear() === cellDate.getFullYear() &&
                   scheduleDate.getMonth() === cellDate.getMonth() &&
                   scheduleDate.getDate() === cellDate.getDate() &&
                   d.startTime && d.endTime;
          });
        });
        
        // If a schedule is found and it matches the current user's username, add a dot to the cell
        if (schedule && schedule.employeeName === currentUser.username) {
          const dot = document.createElement('div');
          dot.className = 'schedule-dot';

          // Create a tooltip with the schedule details
          const tooltip = [];
          for (const [day, times] of Object.entries(schedule.days)) {
            const scheduleDate = new Date(times.date);
            if (scheduleDate.getFullYear() === cellDate.getFullYear() &&
                scheduleDate.getMonth() === cellDate.getMonth() &&
                scheduleDate.getDate() === cellDate.getDate() &&
                times.startTime && times.endTime) {
              const startTime = new Date(times.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endTime = new Date(times.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              tooltip.push(`${day.charAt(0).toUpperCase() + day.slice(1)}: ${startTime} - ${endTime}`);
            }
          }
          dot.title = tooltip.join('\n');

          cell.appendChild(dot);
        }

        row.appendChild(cell);
      }

      // Add empty cells for days after the last day of the month
      while (row.children.length < 7) {
        row.appendChild(document.createElement('td'));
      }

      calendarBody.appendChild(row);
    }

    // Event listener for the previous month button
    document.getElementById('prevMonth').addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar(currentDate);
    });

    // Event listener for the next month button
    document.getElementById('nextMonth').addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar(currentDate);
    });

    // Initial render of the calendar
    renderCalendar(currentDate);
  }

  // Script for new.ejs
  const weekStartDateInput = document.getElementById('weekStartDate');
  if (weekStartDateInput) {
    const today = new Date();
    const nextSunday = new Date(today);

    // Calculate the next Sunday
    if ((7 - today.getDay()) % 7 === 0)
      nextSunday.setDate(today.getDate() + 7);
    else
      nextSunday.setDate(today.getDate() + (7 - today.getDay()) % 7);

    // Format the date to 'YYYY-MM-DD'
    const formatDate = (date) => {
      return date.toLocaleDateString('en-CA');
    };
    weekStartDateInput.value = formatDate(nextSunday);

    // Autofills the dates for the rest of the week
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    daysOfWeek.forEach((day, index) => {
      const dateInput = document.getElementById(`${day}Date`);
      const dayDate = new Date(nextSunday);
      dayDate.setDate(nextSunday.getDate() + index);
      dateInput.value = dayDate.toLocaleDateString('en-CA');
    });
  }
});