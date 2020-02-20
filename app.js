require('dotenv').config();

const express = require('express');
const app = express();
const path = require('path');
const passport = require('passport');
require('./config/passport')(passport);
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/user');

mongoose.connect(process.env.MONGODB_URI, {useUnifiedTopology: true, useNewUrlParser: true}).then(() => {
    console.log('Conected to database')
}).catch((err) => {
    console.log(`Error: ${err.message}`);
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", process.env.CLIENT_DOMAIN);
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
});

app.post('/register', (req, res) => {
    if(!req.body.email || !req.body.password || !req.body.passwordRepeat) {
        res.status(400).json({success: false, message: 'Podaj prawidłowy email i hasło'});
    } else if(req.body.password !== req.body.passwordRepeat) {
        res.status(400).json({success: false, message: 'Podane hasła nie są takie same'});
    } else {
        var newUser = User({
            email: req.body.email,
            password: req.body.password
        });
        newUser.save((err) => {
            if(err) {
                return res.status(400).json({success: false, message: 'Taki użytkonik już istnieje'});
            }
            res.status(201).json({success: true, message: 'Pomyślnie utworzono uzytkownika'});
        });
    }
});

app.post('/login', (req, res) => {
    User.findOne({email: req.body.email}, (err, user) => {
        if(err) throw err;

        if(!user) {
            res.status(401).json({success: false, message: 'Nieprawidłowy adres email'});
        } else {
            user.comparePassword(req.body.password, (err, isMatch) => {
                if(!err && isMatch) {
                    const token = jwt.sign({id: user._id}, process.env.SECRET);
                    res.json({success: true, token: 'JWT ' + token});
                } else {
                    res.status(401).json({success: false, message: 'Nieprawidłowe hasło'});
                }
            });
        }
    });
});

app.get('/user', passport.authenticate('jwt', {session: false}), (req, res) => {
    const userInfo = (({_id, email, ...other}) => ({_id, email}))(req.user);
    res.json(userInfo);
});

app.get('/lists', passport.authenticate('jwt', {session: false}), (req, res) => {
    res.json(req.user.lists.map(x => ({id: x._id, name: x.name})));
});

app.post('/lists', passport.authenticate('jwt', {session: false}), (req, res) => {
    if(req.body.name) {
        if(/^[a-zA-Z0-9 \.!?,:;\-&]+$/.test(req.body.name)) {
            req.user.lists.push({
                name: req.body.name,
                items: []
            });
            req.user.save(err => {
                if(err) {
                    res.status(500).json({message: 'Nie udało się utworzyć listy'});
                } else {
                    res.status(201).json(req.user.lists[req.user.lists.length-1]);
                }
            });
        } else {
            res.status(400).json({message: 'Nazwa zawiera niedozwolone znaki'});
        }
    } else {
        res.status(400).json({message: 'Nie podano nazwy listy'});
    }
});

app.delete('/lists/:id', passport.authenticate('jwt', {session: false}), (req, res) => {
    req.user.lists = req.user.lists.filter(list => !list._id.equals(req.params.id));
    req.user.save(err => {
        err ? res.sendStatus(500) : res.sendStatus(200);
    });
});

app.get('/lists/:listId/items', passport.authenticate('jwt', {session: false}), (req, res) => {
    const list = req.user.lists.find(list => list._id.equals(req.params.listId));
    if(list !== -1) {
        res.json(list.items);
    } else {
        res.status(400).json({message: 'Nie istnieje lista o podanym id'});
    }
});

app.post('/lists/:listId/items', passport.authenticate('jwt', {session: false}), (req, res) => {
    const index = req.user.lists.findIndex(list => list._id.equals(req.params.listId));
    if(index !== -1) {
        if(req.body.name) {
            if(/^[a-zA-Z0-9 \.!?,:;\-&]+$/.test(req.body.name)) {
                req.user.lists[index].items.push({
                    name: req.body.name,
                    price: req.body.price ? parseFloat(req.body.price) : null
                });
                req.user.save(err => {
                    if(err) {
                        res.status(500).json({message: 'Nie można dodać produktu'});
                    } else {
                        res.status(201).json(req.user.lists[index].items[req.user.lists[index].items.length-1]);
                    }
                });
            } else {
                res.status(400).json({message: 'Nazwa zawiera niedozwolone znaki'});
            }
        } else {
            res.status(400).json({message: 'Nie podano nazwy produktu'});
        }
    } else {
        res.status(400).json({message: 'Nie istnieje lista o podanym id'});
    }
});

app.delete('/lists/:listId/items/:itemId', passport.authenticate('jwt', {session: false}), (req, res) => {
    const listIndex = req.user.lists.findIndex(list => list._id.equals(req.params.listId));
    if(listIndex !== -1) {
        const ItemIndex = req.user.lists[listIndex].items.findIndex(item => item._id.equals(req.params.itemId));
        if(ItemIndex !== -1) {
            req.user.lists[listIndex].items.splice(ItemIndex, 1);
            req.user.save(err => {
                if(err) {
                    res.status(500).json({message: 'Nie można usunąć produktu'});
                } else {
                    res.sendStatus(200);
                }
            });
        } else {
            res.status(400).json({message: 'Nie istnieje produkt o podanym id'});
        }
    } else {
        res.status(400).json({message: 'Nie istnieje lista o podanym id'});
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on ${port}`));