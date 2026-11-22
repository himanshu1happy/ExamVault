const getUserRole = (user) => {
    const values = [user?.role, user?.userType]
        .map(value => String(value || '').trim().toLowerCase());

    return values.includes('admin') ? 'admin' : 'user';
};

const toPublicUser = (user) => ({
    id: user._id,
    fullname: user.fullname,
    email: user.email,
    role: getUserRole(user),
    photoUrl: user.photoUrl || user.profilePhoto || ''
});

module.exports = { getUserRole, toPublicUser };
