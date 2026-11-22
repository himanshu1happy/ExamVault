const userSession = localStorage.getItem('examvault_user');
if (!userSession) {
    window.location.replace('login.html');
} else {
    try {
        const user = JSON.parse(userSession);
        const roles = [user.role, user.userType].map(v => String(v || '').toLowerCase());
        if (!roles.includes('admin')) {
            alert("Security Alert: You do not have Admin privileges to view this page.");
            window.location.replace('index.html');
        }
    } catch (e) {
        window.location.replace('login.html');
    }
}
