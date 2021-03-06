const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const bcrypt = require('bcrypt');

const itemSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
        min: 1
    },
    bought: {
        type: Boolean,
        default: false
    },
    category: Schema.Types.ObjectId,
    description: {
        type: String,
        default: ''
    },
    priority: {
       type: Number,
       default: 1
    },
    firstURL: {
        type: String,
        default: ''
    },
    secondURL: {
        type: String,
        default: ''
    }
   
},{_id: true});

const listSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    items: [itemSchema]
});

const categorySchema = new Schema({
    name: {
        type: String,
        required: true
    }
});

const UserSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    lists: [listSchema],
    categories: [categorySchema],
    sortType: {
        type: String,
        default: 'name asc'
    }
});

UserSchema.pre('save', function(next) {
    var user = this;

    if (!user.isModified('password')) return next();

    bcrypt.genSalt(10, function(err, salt) {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, function(err, hash) {
            if (err) return next(err);

            user.password = hash;
            next();
        });
    });
});

UserSchema.methods.comparePassword = function(passw, cb) {
    bcrypt.compare(passw, this.password, (err, isMatch) => {
        if(err) return cb(err);

        cb(null, isMatch);
    });
}

module.exports = mongoose.model('User', UserSchema, 'users');