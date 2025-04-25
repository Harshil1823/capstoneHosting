// Handle the toggle switch for week/month view
document.addEventListener('DOMContentLoaded', () => {
  const monthViewButton = document.getElementById('monthViewButton');
  const weekViewButton = document.getElementById('weekViewButton');
  const schedulesDataElement = document.getElementById('schedulesData');
  const schedules = schedulesDataElement ? JSON.parse(schedulesDataElement.textContent) : [];
  let currentDate = new Date(); // Single source of truth for the current date

  // Function to render the calendar for a given date (month view)
  function renderCalendarMonthView(date) {
    const monthYear = document.getElementById('monthYear');
    const calendarBody = document.getElementById('calendarBody');
    const month = date.getMonth();
    const year = date.getFullYear();

    // Set the month and year in the calendar header
    monthYear.textContent = `${date.toLocaleString('default', { month: 'long' })} ${year}`;

    // Get the first day of the month and the number of days in the month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get the number of days in the previous month
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Clear the calendar body
    calendarBody.innerHTML = '';
    let row = document.createElement('tr');

    // Add dates from the previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const cell = document.createElement('td');
      cell.textContent = daysInPrevMonth - i;
      cell.classList.add('text-muted'); // Add grey styling for previous month dates

      const cellDate = new Date(year, month - 1, daysInPrevMonth - i);

      // Find all schedules for the current cell date
      const matchingSchedules = schedules.filter(s => {
        return Object.values(s.days).some(d => {
          const scheduleDate = new Date(d.date);
          return scheduleDate.getFullYear() === cellDate.getFullYear() &&
                 scheduleDate.getMonth() === cellDate.getMonth() &&
                 scheduleDate.getDate() === cellDate.getDate() &&
                 d.startTime && d.endTime;
        });
      });

      // If matching schedules are found, add a text box for each to the cell
      matchingSchedules.forEach(schedule => {
        if (schedule.employeeName === currentUser.username) {
          const shiftBox = document.createElement('div');
          shiftBox.className = 'schedule-shift-box'; // Use class for styling

          // Add the schedule details to the text box
          const shiftDetails = [];
          for (const [day, times] of Object.entries(schedule.days)) {
            const scheduleDate = new Date(times.date);
            if (scheduleDate.getFullYear() === cellDate.getFullYear() &&
                scheduleDate.getMonth() === cellDate.getMonth() &&
                scheduleDate.getDate() === cellDate.getDate() &&
                times.startTime && times.endTime) {
              const startTime = new Date(times.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endTime = new Date(times.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              shiftDetails.push(`${startTime} - ${endTime}`);
            }
          }
          shiftBox.textContent = shiftDetails.join(', ');
          cell.appendChild(shiftBox);
        }
      });

      row.appendChild(cell);
    }

    // Add cells for each day of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      // If the row is full (7 days), append it to the calendar body and create a new row
      if (row.children.length === 7) {
        calendarBody.appendChild(row);
        row = document.createElement('tr');
      }

      const cell = document.createElement('td');
      cell.textContent = day;

      const cellDate = new Date(year, month, day);

      // Find all schedules for the current cell date
      const matchingSchedules = schedules.filter(s => {
        return Object.values(s.days).some(d => {
          const scheduleDate = new Date(d.date);
          return scheduleDate.getFullYear() === cellDate.getFullYear() &&
                 scheduleDate.getMonth() === cellDate.getMonth() &&
                 scheduleDate.getDate() === cellDate.getDate() &&
                 d.startTime && d.endTime;
        });
      });

      // If matching schedules are found, add a text box for each to the cell
      matchingSchedules.forEach(schedule => {
        if (schedule.employeeName === currentUser.username) {
          const shiftBox = document.createElement('div');
          shiftBox.className = 'schedule-shift-box'; // Use class for styling

          // Add the schedule details to the text box
          const shiftDetails = [];
          for (const [day, times] of Object.entries(schedule.days)) {
            const scheduleDate = new Date(times.date);
            if (scheduleDate.getFullYear() === cellDate.getFullYear() &&
                scheduleDate.getMonth() === cellDate.getMonth() &&
                scheduleDate.getDate() === cellDate.getDate() &&
                times.startTime && times.endTime) {
              const startTime = new Date(times.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endTime = new Date(times.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              shiftDetails.push(`${startTime} - ${endTime}`);
            }
          }
          shiftBox.textContent = shiftDetails.join(', ');
          cell.appendChild(shiftBox);
        }
      });

      row.appendChild(cell);
    }

    // Add dates from the next month
    let nextMonthDay = 1;
    while (row.children.length < 7) {
      const cell = document.createElement('td');
      cell.textContent = nextMonthDay;
      cell.classList.add('text-muted'); // Add grey styling for next month dates

      const cellDate = new Date(year, month + 1, nextMonthDay);

      // Find all schedules for the current cell date
      const matchingSchedules = schedules.filter(s => {
        return Object.values(s.days).some(d => {
          const scheduleDate = new Date(d.date);
          return scheduleDate.getFullYear() === cellDate.getFullYear() &&
                 scheduleDate.getMonth() === cellDate.getMonth() &&
                 scheduleDate.getDate() === cellDate.getDate() &&
                 d.startTime && d.endTime;
        });
      });

      // If matching schedules are found, add a text box for each to the cell
      matchingSchedules.forEach(schedule => {
        if (schedule.employeeName === currentUser.username) {
          const shiftBox = document.createElement('div');
          shiftBox.className = 'schedule-shift-box'; // Use class for styling

          // Add the schedule details to the text box
          const shiftDetails = [];
          for (const [day, times] of Object.entries(schedule.days)) {
            const scheduleDate = new Date(times.date);
            if (scheduleDate.getFullYear() === cellDate.getFullYear() &&
                scheduleDate.getMonth() === cellDate.getMonth() &&
                scheduleDate.getDate() === cellDate.getDate() &&
                times.startTime && times.endTime) {
              const startTime = new Date(times.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endTime = new Date(times.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              shiftDetails.push(`${startTime} - ${endTime}`);
            }
          }
          shiftBox.textContent = shiftDetails.join(', ');
          cell.appendChild(shiftBox);
        }
      });

      nextMonthDay++;
      row.appendChild(cell);
    }

    calendarBody.appendChild(row);
  }

  // Function to render the week view
  function renderCalendarWeekView(date) {
    const calendarBody = document.getElementById('calendarBody');
    const monthYear = document.getElementById('monthYear');
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start from Sunday

    // Set the week range in the header
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    monthYear.textContent = `${startOfWeek.toLocaleDateString('default', { month: 'long', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('default', { month: 'long', day: 'numeric' })}`;

    // Clear the calendar body
    calendarBody.innerHTML = '';
    const row = document.createElement('tr');

    // Add cells for each day of the week
    for (let i = 0; i < 7; i++) {
      const cell = document.createElement('td');
      const cellDate = new Date(startOfWeek);
      cellDate.setDate(startOfWeek.getDate() + i);
      cell.textContent = cellDate.getDate();

      // Find all schedules for the current cell date
      const matchingSchedules = schedules.filter(s => {
        return Object.values(s.days).some(d => {
          const scheduleDate = new Date(d.date);
          return scheduleDate.getFullYear() === cellDate.getFullYear() &&
                 scheduleDate.getMonth() === cellDate.getMonth() &&
                 scheduleDate.getDate() === cellDate.getDate() &&
                 d.startTime && d.endTime;
        });
      });

      // If matching schedules are found, add a text box for each to the cell
      matchingSchedules.forEach(schedule => {
        if (schedule.employeeName === currentUser.username) {
          const shiftBox = document.createElement('div');
          shiftBox.className = 'schedule-shift-box'; // Use class for styling

          // Add the schedule details to the text box
          const shiftDetails = [];
          for (const [day, times] of Object.entries(schedule.days)) {
            const scheduleDate = new Date(times.date);
            if (scheduleDate.getFullYear() === cellDate.getFullYear() &&
                scheduleDate.getMonth() === cellDate.getMonth() &&
                scheduleDate.getDate() === cellDate.getDate() &&
                times.startTime && times.endTime) {
              const startTime = new Date(times.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endTime = new Date(times.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              shiftDetails.push(`${startTime} - ${endTime}`);
            }
          }
          shiftBox.textContent = shiftDetails.join(', ');
          cell.appendChild(shiftBox);
        }
      });

      row.appendChild(cell);
    }

    calendarBody.appendChild(row);
  }

  monthViewButton.addEventListener('click', () => {
    monthViewButton.classList.add('active');
    weekViewButton.classList.remove('active');
    renderCalendarMonthView(currentDate);
  });

  weekViewButton.addEventListener('click', () => {
    weekViewButton.classList.add('active');
    monthViewButton.classList.remove('active');
    renderCalendarWeekView(currentDate);
  });

  // Event listener for the previous button
  document.getElementById('prevMonth').addEventListener('click', () => {
    if (weekViewButton.classList.contains('active')) {
      // Week view: Go to the previous week
      currentDate.setDate(currentDate.getDate() - 7);
      renderCalendarWeekView(currentDate);
    } else {
      // Month view: Go to the previous month
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendarMonthView(currentDate);
    }
  });

  // Event listener for the next button
  document.getElementById('nextMonth').addEventListener('click', () => {
    if (weekViewButton.classList.contains('active')) {
      // Week view: Go to the next week
      currentDate.setDate(currentDate.getDate() + 7);
      renderCalendarWeekView(currentDate);
    } else {
      // Month view: Go to the next month
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendarMonthView(currentDate);
    }
  });

  // Initial render of the calendar
  renderCalendarWeekView(currentDate); // Set week view as the default
  weekViewButton.classList.add('active');
  monthViewButton.classList.remove('active');

  // Handle the Manager View toggle
  const managerViewToggle = document.getElementById('managerViewToggle');
  if (managerViewToggle) {
    managerViewToggle.addEventListener('change', function () {
      if (this.checked) {
        window.location.href = '/schedules/managerView';
      } else {
        window.location.href = '/schedules';
      }
    });
  }
});

// Script for new.ejs
const weekStartDateInput = document.getElementById('weekStartDate');
if (weekStartDateInput) {
  const today = new Date();
  const nextSunday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  
  // Calculate the next Sunday
  if ((7 - today.getDay()) % 7 === 0)
    nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
  else
    nextSunday.setUTCDate(nextSunday.getUTCDate() + (7 - today.getDay()) % 7);

  nextSunday.setUTCDate(nextSunday.getUTCDate() + 1);

  // Format the date to 'YYYY-MM-DD'
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };
  weekStartDateInput.value = formatDate(nextSunday);

  // Autofills the dates for the rest of the week
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const updateWeekDates = (startDate) => {
    const utcStartDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
    daysOfWeek.forEach((day, index) => {
      const dateInput = document.getElementById(`${day}Date`);
      if (dateInput) {
        const dayDate = new Date(utcStartDate);
        dayDate.setUTCDate(utcStartDate.getUTCDate() + index);
        dateInput.value = formatDate(dayDate);
      }
    });
  };

  updateWeekDates(nextSunday);

  // Add event listener to update dates when weekStartDate changes
  weekStartDateInput.addEventListener('change', (event) => {
    const newStartDate = new Date(event.target.value);
    if (!isNaN(newStartDate)) {
      const utcNewStartDate = new Date(Date.UTC(newStartDate.getFullYear(), newStartDate.getMonth(), newStartDate.getDate()));
      utcNewStartDate.setUTCDate(utcNewStartDate.getUTCDate() + 1);
      updateWeekDates(utcNewStartDate);
    }
  });
}

// Add swipe effect logic
document.addEventListener('DOMContentLoaded', () => {
  const calendarBody = document.getElementById('calendarBody');
  const prevMonth = document.getElementById('prevMonth');
  const nextMonth = document.getElementById('nextMonth');

  function applySwipeEffect(direction) {
    const swipeOutClass = direction === 'left' ? 'swipe-out-left' : 'swipe-out-right';
    const swipeInClass = direction === 'left' ? 'swipe-in-left' : 'swipe-in-right';

    // Apply swipe-out animation
    calendarBody.classList.add(swipeOutClass);

    setTimeout(() => {
      calendarBody.classList.remove(swipeOutClass);
      // Trigger calendar update logic here (e.g., load new month data)

      // Apply swipe-in animation after swipe-out is complete
      calendarBody.classList.add(swipeInClass);
      setTimeout(() => {
        calendarBody.classList.remove(swipeInClass);
      }, 100); // Match the animation duration
    }, 100); // Match the animation duration
  }

  prevMonth.addEventListener('click', () => applySwipeEffect('right'));
  nextMonth.addEventListener('click', () => applySwipeEffect('left'));
});