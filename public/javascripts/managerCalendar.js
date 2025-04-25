document.addEventListener('DOMContentLoaded', () => {
  const schedulesData = JSON.parse(document.getElementById('schedulesData').textContent);
  const currentDate = new Date();
  const monthViewButton = document.getElementById('monthViewButton');
  const weekViewButton = document.getElementById('weekViewButton');
  const monthYear = document.getElementById('monthYear');
  const calendarBody = document.getElementById('calendarBody');

  // Add event listener for the Manager View toggle
  const managerViewToggle = document.getElementById('managerViewToggle');
  if (managerViewToggle) {
    managerViewToggle.addEventListener('change', function () {
      if (!this.checked) {
        window.location.href = '/schedules'; // Navigate back to index.ejs
      }
    });
  }

  // Function to render the calendar for a given date (month view)
  function renderCalendarMonthView(date) {
    const month = date.getMonth();
    const year = date.getFullYear();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    monthYear.textContent = `${date.toLocaleString('default', { month: 'long' })} ${year}`;
    calendarBody.innerHTML = '';
    let row = document.createElement('tr');

    // Add dates from the previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const cell = document.createElement('td');
      cell.textContent = daysInPrevMonth - i;
      cell.classList.add('text-muted');
      row.appendChild(cell);
    }

    // Add cells for each day of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      if (row.children.length === 7) {
        calendarBody.appendChild(row);
        row = document.createElement('tr');
      }
      const cell = document.createElement('td');
      cell.textContent = day;

      const cellDate = new Date(year, month, day);
      const matchingSchedules = schedulesData.filter(schedule => {
        return Object.values(schedule.days).some(d => {
          const scheduleDate = new Date(d.date);
          return scheduleDate.getFullYear() === cellDate.getFullYear() &&
                 scheduleDate.getMonth() === cellDate.getMonth() &&
                 scheduleDate.getDate() === cellDate.getDate() &&
                 d.startTime && d.endTime;
        });
      });

      matchingSchedules.forEach(schedule => {
        const shiftBox = document.createElement('div');
        shiftBox.className = 'schedule-shift-box';
        const shiftDetails = [];
        for (const [day, times] of Object.entries(schedule.days)) {
          const scheduleDate = new Date(times.date);
          if (scheduleDate.getFullYear() === cellDate.getFullYear() &&
              scheduleDate.getMonth() === cellDate.getMonth() &&
              scheduleDate.getDate() === cellDate.getDate() &&
              times.startTime && times.endTime) {
            const startTime = new Date(times.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(times.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            shiftDetails.push(`${schedule.employeeName}: ${startTime} - ${endTime}`);
          }
        }
        shiftBox.textContent = shiftDetails.join(', ');
        cell.appendChild(shiftBox);
      });

      row.appendChild(cell);
    }

    // Add dates from the next month
    let nextMonthDay = 1;
    while (row.children.length < 7) {
      const cell = document.createElement('td');
      cell.textContent = nextMonthDay++;
      cell.classList.add('text-muted');
      row.appendChild(cell);
    }
    calendarBody.appendChild(row);
  }

  // Function to render the week view
  function renderCalendarWeekView(date) {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    monthYear.textContent = `${startOfWeek.toLocaleDateString('default', { month: 'long', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('default', { month: 'long', day: 'numeric' })}`;
    calendarBody.innerHTML = '';
    const row = document.createElement('tr');

    for (let i = 0; i < 7; i++) {
      const cell = document.createElement('td');
      const cellDate = new Date(startOfWeek);
      cellDate.setDate(startOfWeek.getDate() + i);
      cell.textContent = cellDate.getDate();

      const matchingSchedules = schedulesData.filter(schedule => {
        return Object.values(schedule.days).some(d => {
          const scheduleDate = new Date(d.date);
          return scheduleDate.getFullYear() === cellDate.getFullYear() &&
                 scheduleDate.getMonth() === cellDate.getMonth() &&
                 scheduleDate.getDate() === cellDate.getDate() &&
                 d.startTime && d.endTime;
        });
      });

      matchingSchedules.forEach(schedule => {
        const shiftBox = document.createElement('div');
        shiftBox.className = 'schedule-shift-box ';
        const shiftDetails = [];
        for (const [day, times] of Object.entries(schedule.days)) {
          const scheduleDate = new Date(times.date);
          if (scheduleDate.getFullYear() === cellDate.getFullYear() &&
              scheduleDate.getMonth() === cellDate.getMonth() &&
              scheduleDate.getDate() === cellDate.getDate() &&
              times.startTime && times.endTime) {
            const startTime = new Date(times.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const endTime = new Date(times.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            shiftDetails.push(`${schedule.employeeName}: ${startTime} - ${endTime}`);
          }
        }
        shiftBox.textContent = shiftDetails.join(', ');
        cell.appendChild(shiftBox);
      });

      row.appendChild(cell);
    }
    calendarBody.appendChild(row);
  }

  // Function to apply swipe animations
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

  document.getElementById('prevMonth').addEventListener('click', () => {
    applySwipeEffect('right');
    if (weekViewButton.classList.contains('active')) {
      currentDate.setDate(currentDate.getDate() - 7);
      renderCalendarWeekView(currentDate);
    } else {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendarMonthView(currentDate);
    }
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    applySwipeEffect('left');
    if (weekViewButton.classList.contains('active')) {
      currentDate.setDate(currentDate.getDate() + 7);
      renderCalendarWeekView(currentDate);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendarMonthView(currentDate);
    }
  });

  // Initial render
  renderCalendarWeekView(currentDate);
  weekViewButton.classList.add('active');
  monthViewButton.classList.remove('active');
});
