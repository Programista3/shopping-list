exports.getCategories = (req, res) => {
    var categories = req.user.categories.map(x => ({_id: x._id, name: x.name, itemCount: 0}));
    for(list of req.user.lists) {
        for(item of list.items) {
            if(typeof item.category !== 'undefined') {
                const index = categories.findIndex(x => x._id.equals(item.category))
                if(index != -1) {
                    categories[index].itemCount++;
                }
            }
        }
    }
    res.json(categories);
}

exports.addCategory = (req, res) => {
    if(req.body.name) {
        if(nameRegex.test(req.body.name)) {
            req.user.categories.push({
                name: req.body.name
            });
            req.user.save(err => {
                if(err) {
                    res.status(500).json({message: 'Nie udało się utworzyć kategorii'});
                } else {
                    res.status(201).json([req.user.categories[req.user.categories.length-1]].map(x => ({_id: x._id, name: x.name, itemCount: 0}))[0]);
                }
            });
        } else {
            res.status(400).json({message: 'Nazwa zawiera niedozwolone znaki'});
        }
    } else {
        res.status(400).json({message: 'Nie podano nazwy kategorii'});
    }
}

exports.getItems = (req, res) => {
    const category = req.user.categories.find(x => x._id.equals(req.params.categoryId));
    if(category !== -1) {
        var data = {
            name: category.name,
            items: [],
            itemCount: 0
        }
        for(list of req.user.lists) {
            for(item of list.items) {
                if(req.params.categoryId == item.category) {
                    data.items.push(Object.assign({listId: list._id}, item.toObject()));
                }
            }
        }
        data.itemCount = data.items.length;
        res.json(data);
    } else {
        res.status(400).json({message: 'Nie istnieje kategoria o podanym id'});
    }
}