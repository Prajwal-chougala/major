const axios = require('axios');

async function test() {
    try {
        let token;
        try {
            const signupRes = await axios.post('http://localhost:5000/auth/signup', {
                name: "Test",
                email: "test@test.com",
                password: "password",
                mobileNumber: "+15551234567"
            });
        } catch(e) {} // ignore if already exists

        const loginRes = await axios.post('http://localhost:5000/auth/login', {
            email: "test@test.com",
            password: "password"
        });
        token = loginRes.data.token;
        console.log("Logged in, token:", token.substring(0, 10) + "...");

        const deviceRes = await axios.post('http://localhost:5000/device', {
            name: "Test Device"
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Success:", deviceRes.data);
    } catch (e) {
        if (e.response) {
            console.error("Error from server:", e.response.status, e.response.data);
        } else {
            console.error("Error:", e.message);
        }
    }
}
test();
