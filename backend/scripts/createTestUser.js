const { User, sequelize } = require('../models');
const bcrypt = require("bcryptjs");

async function createUser() {
    try {
        await sequelize.sync();

        const username = 'testuser';
        const password = 'testuser';

        const existingUser = await User.findOne({ where: { username } });

        if (existingUser) {
            console.log('Użytkownik testuser już istnieje');
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await User.create({
            username,
            passwordHash
        });

        console.log('Użytkownik testuser został utworzony');
    } catch (err) {
        console.error('Błąd przy tworzeniu użytkownika:', err);
        process.exit(1);
    }
}

createUser();
