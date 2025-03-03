 // Example starter JavaScript for disabling form submissions if there are invalid fields
 (() => {
    'use strict'

    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll('.needs-validation')

    // Loop over them and prevent submission
    Array.from(forms)
    .forEach(form => {
        form.addEventListener('submit', event => {
        if (!form.checkValidity()) {
            event.preventDefault()
            event.stopPropagation()
        }
        
        // Password confirmation logic
        const password = form.querySelector('#password');
        const confirmPassword = form.querySelector('#confirmPassword');
        if (password && confirmPassword && password.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity("Passwords do not match.");
            event.preventDefault();
            event.stopPropagation();
        } else if (confirmPassword) {
            confirmPassword.setCustomValidity("");
        }

        form.classList.add('was-validated')
        }, false)
    })
})()