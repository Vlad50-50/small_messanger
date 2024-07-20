const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const span = document.getElementById("response");

let elementPosition = targetElement.getBoundingClientRect().top + window.scrollY + 10000;

document.getElementById('to_register').addEventListener('click', () => {
    let targetElement = document.getElementById('targetElement');
    targetElement.scrollIntoView({
        behavior: 'smooth'
    });

    let shapes = document.querySelectorAll('.background .shape');
    shapes[0].style.left = '300px';
    shapes[1].style.right = '300px';
    shapes[0].style.background = 'linear-gradient(60deg, rgba(216,55,215,1) 0%, rgba(55,216,203,1) 100%)';
    shapes[1].style.background = 'linear-gradient(30deg, rgba(216,76,55,1) 0%, rgba(216,55,212,1) 100%)';
});

document.getElementById('to_login').addEventListener('click', () => {
    let targetElement = document.getElementById('targetElement1');
    targetElement.scrollIntoView({
        top: elementPosition,
        behavior: 'smooth'
    });
    targetElement.style.marginBottom = '45px';
    let shapes = document.querySelectorAll('.background .shape');
    shapes[0].style.left = '-80px';
    shapes[1].style.right = '-30px';
    shapes[0].style.background = 'linear-gradient(#1845ad,#23a2f6)';
    shapes[1].style.background = 'linear-gradient(to right,#ff512f,#f09819)';
})

registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    span.innerHTML = null;

    const loginElement = document.getElementById("usernameReg");
    const passwordElement = document.getElementById("passwordReg");

    if (!loginElement || !passwordElement) {
        span.style.color = "red";
        span.innerHTML = "Missing login or password field.";
        return;
    }

    const user = {
        login: loginElement.value,
        password: passwordElement.value
    };

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(user)
        });
        const result = await response.json();
        if (result.error) {
            span.style.color = "red";
            span.innerHTML = result.error;
        } else {
            span.style.color = "lime";
            span.innerHTML = result.res;
            setTimeout(() => {
                window.location.href = "/login";
            }, 1000);
        }
    } catch (error) {
        span.style.color = "red";
        span.innerHTML = "An error occurred during registration.";
    }
});

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    span.innerHTML = null;

    const loginElement = document.getElementById("usernameLog");
    const passwordElement = document.getElementById("passwordLog");

    if (!loginElement || !passwordElement) {
        span.style.color = "red";
        span.innerHTML = "Missing login or password field.";
        return;
    }

    const user = {
        login: loginElement.value,
        password: passwordElement.value
    };

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(user)
        });
        const result = await response.json();
        if (result.error) {
            span.style.color = "red";
            span.innerHTML = result.error;
        } else {
            const token = result.token;
            let date = new Date();
            date.setTime(date.getTime() + 7 * 24 * 60 * 60 * 1000);
            document.cookie = `token=${token};expires=${date.toUTCString()};path=/`;
            window.location.assign("/");
        }
    } catch (error) {
        span.style.color = "red";
        span.innerHTML = "An error occurred during login.";
    }
});