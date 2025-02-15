require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bodyParser = require('body-parser');
const paypal = require('paypal-rest-sdk');
const path = require('path');
const multer = require('multer');
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));
// Database Connection and Auto-Creation
const db = mysql.createConnection({
    host: 'sql.freedb.tech',
    user: 'freedb_orign',
    password: 'Km&z34Zqu6#JP8n',
});

db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');

    db.query("CREATE DATABASE IF NOT EXISTS ecommercek", (err) => {
        if (err) throw err;
        console.log("Database created or exists");

        db.changeUser({ database: 'ecommercek' }, (err) => {
            if (err) throw err;
            
            const createUsers = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    role ENUM('customer', 'seller') NOT NULL
                )
            `;





            const createProducts = `
                CREATE TABLE IF NOT EXISTS products (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    seller_user TEXT,
                    name VARCHAR(100) NOT NULL,
                    description TEXT,
                    product_location TEXT,
                    product_condition TEXT,
                    price DECIMAL(10,2) NOT NULL,
                    image VARCHAR(255),
                    category ENUM('product', 'service') NOT NULL
                    )
            `;

            const createReviews = `
                CREATE TABLE IF NOT EXISTS reviews (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id INT NOT NULL,
                    user_id INT NOT NULL,
                    rating INT CHECK (rating BETWEEN 1 AND 5),
                    comment TEXT
                     )
            `;

            db.query(createUsers, (err) => { if (err) throw err; });
            db.query(createProducts, (err) => { if (err) throw err; });
            db.query(createReviews, (err) => { if (err) throw err; });

            console.log("Tables created or already exist");
            
            db.query(`
    CREATE TABLE IF NOT EXISTS services (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        base_image VARCHAR(255),
        image1 VARCHAR(255),
        image2 VARCHAR(255),
        image3 VARCHAR(255),
        contact VARCHAR(255) NOT NULL,
        social_media TEXT,
        website VARCHAR(255),
        seller_user TEXT
        
    )
`, (err) => {
    if (err) throw err;
    console.log("Services table ready.");
});
            
            
            
        });
    });
});

// Passport Authentication
passport.use(new LocalStrategy((username, password, done) => {
	
    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return done(err);
        if (results.length === 0) return done(null, false, { message: 'User not found' });
        bcrypt.compare(password, results[0].password, (err, isMatch) => {
            if (isMatch) return done(null, results[0]);
            else return done(null, false, { message: 'Incorrect password' });
        });
    });
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    db.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
        done(err, results[0]);
    });
});
// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'home.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));

app.post('/register', (req, res) => {
    const { username, email, password, role } = req.body;
        
    bcrypt.hash(password, 10, (err, hash) => {
        db.query('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', 
            [username, email, hash, role], (err, result) => {
            if (err) throw err;
            res.redirect('/login');
        });
    });
});

app.post('/login', passport.authenticate('local', { successRedirect: '/dashboard', failureRedirect: '/login' }));

// Set up multer for image uploads
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });
// Route to add a product
app.post('/add_product', upload.single('image'), (req, res) => {
    const { name, price,description ,location,condition} = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : '/uploads/default.png';
    const seller_user = req.user.username; // TODO: Replace with the logged-in user's ID when authentication is implemented.

    const sql = 'INSERT INTO products (name, price, image, seller_user, description, product_location, product_condition) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [name, price, image, seller_user, description,location,condition], (err) => {
        if (err) throw err;
        res.redirect('/dashboard');
    });
});

app.get('/dashboard', (req, res) => {

    db.query('SELECT * FROM products', (err, products) => {
        if (err) throw err;

        db.query('SELECT * FROM services', (err, services) => {
            if (err) throw err;

            res.sendFile(__dirname + "/views/dashboard.html"); // Load the HTML file
        });
    });
});
app.get('/api/dashboard', (req, res) => {
    db.query('SELECT * FROM products', (err, products) => {
        if (err) throw err;

        db.query('SELECT * FROM services', (err, services) => {
            if (err) throw err;

            res.json({ products, services });
        });
    });
});
app.get('/product/:id', (req, res) => {
    let productId = req.params.id;
    db.query('SELECT * FROM products WHERE id = ?', [productId], (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.send("Product not found");

        let product = results[0];

        let productDetailsHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>${product.name} - Product Details</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
             <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
            <style>
                body { background-color: #f5f5f5; font-family: 'Arial', sans-serif; }
                .container { max-width: 750px; margin: auto; background: #fff; padding: 10px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }

             
                /* Sections */
                .section { padding: 6px 8px; border-bottom: 1px solid #ddd; font-size: 0.9em; }
                .section-title { font-weight: bold; font-size: 1em; display: flex; align-items: center; margin-bottom: 2px; }
                .icon { margin-right: 5px; font-size: 1.1em; color: #555; }

                /* Side-by-side Sections */
                .row-section { display: flex; justify-content: space-between; padding: 6px 8px; border-bottom: 1px solid #ddd; }
                .row-section div { width: 48%; }

                /* Price Section */
                .price-section { display: flex; justify-content: space-between; padding: 8px; align-items: center; border-bottom: 1px solid #ddd; }
                .price { font-size: 1.3em; font-weight: bold; color:  #198754; }
                .badge { font-size: 0.8em; padding: 3px 6px; border-radius: 5px; background: #e9ecef; }

                /* Buy Button */
                .buy-btn { width: 100%; font-size: 1em; padding: 8px; font-weight: bold; background-color:  #198754; border: none; color: #fff; border-radius: 5px; }
                .buy-btn:hover { background-color:  #198754; }
            </style>
        </head>
        <body>
            <div class="container mt-3">
                <a href="/dashboard" class="btn btn-secondary back-btn"><i class="fas fa-arrow-left"></i> Back</a>
              
              
                <div id="productCarousel" class="carousel slide mt-3" data-bs-ride="carousel">
                    <div class="carousel-indicators">
                        <button type="button" data-bs-target="#productCarousel" data-bs-slide-to="0" class="active"></button>
                        <button type="button" data-bs-target="#productCarousel" data-bs-slide-to="1"></button>
                        <button type="button" data-bs-target="#productCarousel" data-bs-slide-to="2"></button>
                        <button type="button" data-bs-target="#productCarousel" data-bs-slide-to="3"></button>
                    </div>
                    <div class="carousel-inner">
                        <div class="carousel-item active">
                            <img src="${product.image}" class="d-block w-100">
                        </div>
                        <div class="carousel-item">
                            <img src="${product.image}" class="d-block w-100">
                        </div>
                        <div class="carousel-item">
                            <img src="${product.image}" class="d-block w-100">
                        </div>
                        <div class="carousel-item">
                            <img src="${product.image}" class="d-block w-100">
                        </div>
                    </div>
                    <button class="carousel-control-prev" type="button" data-bs-target="#productCarousel" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon"></span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#productCarousel" data-bs-slide="next">
                        <span class="carousel-control-next-icon"></span>
                    </button>
                </div>





  <h3 class="mt-2">${product.name}</h3>
  
                <!-- Price & Category -->
                <div class="price-section">
                    <span class="price">UGX ${product.price}</span>
                    <span class="badge">${product.category || "Category"}</span>
                </div>

                <!-- Sections -->
                <div class="section">
                    <div class="section-title"><i class="fas fa-info-circle icon"></i> Description</div>
                    <p>${product.description || "No description available."}</p>
                </div>

                <div class="row-section">
                    <div>
                        <div class="section-title"><i class="fas fa-industry icon"></i> Brand</div>
                        <p>${product.brand || "No information available."}</p>
                    </div>
                    <div>
                        <div class="section-title"><i class="fas fa-box icon"></i> Condition</div>
                        <p>${product.product_condition || "No information available."}</p>
                    </div>
                </div>

                <div class="row-section">
                    <div>
                        <div class="section-title"><i class="fas fa-palette icon"></i> Color</div>
                        <p>${product.color || "No information available."}</p>
                    </div>
                    <div>
                        <div class="section-title"><i class="fas fa-cube icon"></i> Material</div>
                        <p>${product.material || "No information available."}</p>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title"><i class="fas fa-map-marker-alt icon"></i> Location</div>
                    <p>${product.product_location || "No information available."}</p>
                </div>

                <div class="section">
                    <div class="section-title"><i class="fas fa-truck icon"></i> Delivery Information</div>
                    <p>${product.delivery || "No information available."}</p>
                </div>

                <!-- Buy Now Button -->
                <button class="btn buy-btn"><i class="fas fa-shopping-cart"></i> Buy Now</button>
            </div>

            
        </body>
        </html>`;

        res.send(productDetailsHTML);
    });
});
app.get('/add_product', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'add-product.html'));
});
//services

app.get('/add_service', (req, res) => {
    let addServiceHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <title>Add Service</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    </head>
    <body>
        <div class="container mt-4">
            <h3>Add a New Service</h3>
            <form action="/add_service" method="POST" enctype="multipart/form-data">
                <label class="form-label">Service Name:</label>
                <input type="text" name="name" class="form-control" required>

                <label class="form-label mt-2">Category:</label>
                <select name="category" class="form-control" required>
                    <option value="Events Management">Events Management</option>
                    <option value="Catering">Catering</option>
                    <option value="Jewelry Shop">Jewelry Shop</option>
                    <option value="Tech Gadgets">Tech Gadgets</option>
                    <option value="Plumbing">Plumbing</option>
                </select>

                <label class="form-label mt-2">Description:</label>
                <textarea name="description" class="form-control" required></textarea>

                <label class="form-label mt-2">Contact:</label>
                <input type="text" name="contact" class="form-control" required>

                <label class="form-label mt-2">Base Image:</label>
                <input type="file" name="base_image" class="form-control" required>

                <label class="form-label mt-2">Additional Images:</label>
                <input type="file" name="image1" class="form-control">
                <input type="file" name="image2" class="form-control">
                <input type="file" name="image3" class="form-control">

                <label class="form-label mt-2">Social Media Handles (optional):</label>
                <input type="text" name="social_media" class="form-control">

                <label class="form-label mt-2">Website (optional):</label>
                <input type="text" name="website" class="form-control">

                <button type="submit" class="btn btn-primary mt-3">Add Service</button>
            </form>
        </div>
    </body>
    </html>`;

    res.send(addServiceHTML);
});

app.post('/add_service', upload.fields([
    { name: 'base_image', maxCount: 1 },
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
]), (req, res) => {
    const { name, category, description, contact, social_media, website } = req.body;
    const base_image = req.files['base_image'] ? `/uploads/${req.files['base_image'][0].filename}` : null;
    const image1 = req.files['image1'] ? `/uploads/${req.files['image1'][0].filename}` : null;
    const image2 = req.files['image2'] ? `/uploads/${req.files['image2'][0].filename}` : null;
    const image3 = req.files['image3'] ? `/uploads/${req.files['image3'][0].filename}` : null;
const seller_user=req.user.username
    db.query(`
        INSERT INTO services (name, category, description, base_image, image1, image2, image3, contact, social_media, website,seller_user)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [name, category, description, base_image, image1, image2, image3, contact, social_media, website,seller_user], (err) => {
        if (err) throw err;
        res.redirect('/dashboard');
    });
});


app.get('/service/:id', (req, res) => {
    const serviceId = req.params.id;
    db.query('SELECT * FROM services WHERE id = ?', [serviceId], (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.send('Service not found.');

        const service = results[0];

        res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>${service.name}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
        </head>
        <body>
            <div class="container mt-4">
                <img src="${service.base_image}" class="img-fluid mb-3">
                <h3>${service.name}</h3>
                <p><strong>Category:</strong> ${service.category}</p>
                <p>${service.description}</p>
                <p><strong>Contact:</strong> ${service.contact}</p>
       see        ${service.website ? `<p><strong>Website:</strong> <a href="${service.website}" target="_blank">${service.website}</a></p>` : ''}
                ${service.social_media ? `<p><strong>Social Media:</strong> ${service.social_media}</p>` : ''}
            </div>
        </body>
        </html>
        `);
    });
});


app.get('/search', (req, res) => {
    const query = req.query.query;

    db.query(`SELECT * FROM products WHERE name LIKE ?`, [`%${query}%`], (err, productResults) => {
        if (err) throw err;

        db.query(`SELECT * FROM services WHERE name LIKE ?`, [`%${query}%`], (err, serviceResults) => {
            if (err) throw err;

            let productHTML = productResults.map(product => `
                <div class="col-6 col-md-4 col-lg-3 mb-3">
                    <a href="/product/${product.id}" class="text-decoration-none">
                        <div class="card shadow-sm">
                            <img src="${product.image}" class="card-img-top" style="height: 180px; object-fit: cover;">
                            <div class="card-body text-center">
                                <h6 class="card-title">${product.name}</h6>
                                <p class="card-text text-success fw-bold">UGX ${product.price}</p>
                            </div>
                        </div>
                    </a>
                </div>
            `).join('');

            let serviceHTML = serviceResults.map(service => `
                <a href="/service/${service.id}" class="list-group-item d-flex align-items-center">
                    <img src="${service.base_image}" class="me-3" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                    <div>
                        <h6>${service.name}</h6>
                        <p>${service.description.substring(0, 80)}...</p>
                    </div>
                </a>
            `).join('');

            res.send(`<div class="container"><h4>Search Results</h4>${productHTML}${serviceHTML}</div>`);
        });
    });
});

app.get('/my-productsi', (req, res) => {
    const userId = req.user.username;

    db.query('SELECT * FROM products WHERE seller_user = ?', [userId], (err, products) => {
        if (err) throw err;

        db.query('SELECT * FROM services WHERE seller_user = ?', [userId], (err, services) => {
            if (err) throw err;

            res.json({ products, services });
        });
    });
});

app.get('/my-products', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const userId = req.user.username;

    db.query('SELECT * FROM products WHERE seller_user = ?', [userId], (err, products) => {
        if (err) throw err;

        db.query('SELECT * FROM services WHERE seller_user = ?', [userId], (err, services) => {
            if (err) throw err;

            // ✅ Build HTML response dynamically
            let html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>My Products & Services</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
                    .navbar { background: #008000; padding: 10px; color: white; font-size: 18px; display: flex; align-items: center; }
                    .menu-icon { cursor: pointer; font-size: 24px; margin-right: 10px; }
                    .container { padding: 20px; }
                    .product-grid, .service-list { display: flex; flex-wrap: wrap; gap: 15px; }
                    .product-card, .service-item { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 45%; }
                    .product-card img, .service-item img { width: 100%; border-radius: 5px; }
                    .add-btn { display: block; text-align: center; background: #008000; color: white; padding: 10px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
                    .buttons { margin-top: 20px; text-align: center; }
                </style>
            </head>
            <body>

                <nav class="navbar">
                    <span class="menu-icon" onclick="toggleMenu()">☰</span>
                    My Products & Services
                </nav>

                <div class="container">
                    <h2>Your Products</h2>
                    <div class="product-grid">`;

            products.forEach(product => {
                html += `
                    <div class="product-card">
                        <img src="${product.image}" alt="Product Image">
                        <h3>${product.name}</h3>
                        <p>UGX ${product.price}</p>
                        <a href="/edit_product/${product.id}" class="text-decoration-none"> <button >✏ Edit</button></a>
                        <button onclick="deleteProduct('${product.id}')">🗑 Delete</button>
                    </div>`;
            });

            html += `
                    </div>
                    <h2>Your Services</h2>
                    <div class="service-list">`;

            services.forEach(service => {
                html += `
                    <div class="service-item">
                        <img src="${service.base_image}" alt="Service Image" width="100">
                        <div>
                            <h3>${service.service_name}</h3>
                            <p>${service.description}</p>
                             <a href="/edit_service/${service.id}" class="text-decoration-none"> <button>✏ Edit</button></a>
                            <button onclick="deleteService('${service.id}')">🗑 Delete</button>
                        </div>
                    </div>`;
            });

            html += `
                    </div>
                    <div class="buttons">
                        <a href="/add_product" class="add-btn">➕ Add Product</a>
                        <a href="/add_service" class="add-btn">➕ Add Service</a>
                    </div>
                </div>`
                
                res.send(html)
                
})
})
                

})
app.post('/update_product/:id',upload.single('image') , (req, res) => {
	const id=req.params.id
    const { name, price,description ,location,condition} = req.body;
   const image = req.file ? `/uploads/${req.file.filename}` : '/uploads/default.png';
  
 
   console.log(`Updating product ID: ${id}, Name: ${name}, Price: ${price}, Description: ${description}`);
console.log(name)
    db.query(
        'UPDATE products SET name = ?, price = ?, image= ?, description = ? WHERE id = ?',
        [name, price, image, description, id],
        (err, result) => {
            if (err) {
                console.error('Update Product Error:', err);
                return res.status(500).json({ error: 'Error updating product' });
            }
            console.log('Update Result:', result);
                        res.redirect("/my-products")
        }
       
    );
 
 
 
 
  })
app.get('/edit_product/:id', (req, res) => {
    let productId = req.params.id;
    db.query('SELECT * FROM products WHERE id = ?', [productId], (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.send("Product not found");

        let product = results[0];

        let productDetailsHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>${product.name} - Product Details</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <style>
                body { background-color: #f8f9fa; font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: auto; }
                .product-img { width: 100%; height: 300px; object-fit: cover; border-radius: 8px; }
                .back-btn { display: block; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container mt-4">
                <a href="/dashboard" class="btn btn-secondary back-btn">← Back to Dashboard</a>
             <form action="/update_product/${product.id}" method="post" enctype="multipart/form-data">
                <div class="mb-3">
                    <label>Product Name</label>
                    <input type="text" value="${product.name}" class="form-control" name="name" placeholder="Enter product name" required>
                </div>
                <div class="mb-3">
                    <label>Seller Location</label>
                    <input type="text" value="${product.product_location}" class="form-control" name="location" placeholder="Enter seller location" required>
                </div>
               <div class="mb-3">
               
                        <select name="condition" class="form-control">
                            <option value="Brand New">Brand New</option>
                            <option value="Pre-owned">Pre-owned</option>
                        </select>
                    </div>
                    <div class="mb-3">
                    <label>Product description</label>
                    
                <textarea name="description" class="form-control" required>${product.description}</textarea>

                   </div>
                <div class="mb-3">
                    <label>Price (UGX)</label>
                    <input type="number" value="${product.price}" class="form-control" name="price" placeholder="Enter price" required>
                </div>
                <div class="mb-3">
                    <label>Product Image</label>
                    <input type="file" class="form-control" name="image" required>
                
                 </div>
                 <button type="submit" class="btn btn-success w-100">Update Product </button>
            </form>
        </body>
        </html>`;

        res.send(productDetailsHTML);
    });
});
app.get('/edit_service/:id', (req, res) => {
    let productId = req.params.id;
    db.query('SELECT * FROM services WHERE id = ?', [productId], (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.send("Product not found");

        let service = results[0];

        let productDetailsHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>${service.name} - Product Details</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <style>
                body { background-color: #f8f9fa; font-family: Arial, sans-serif; }
                .container { max-width: 600px; margin: auto; }
                .product-img { width: 100%; height: 300px; object-fit: cover; border-radius: 8px; }
                .back-btn { display: block; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container mt-4">
                <a href="/dashboard" class="btn btn-secondary back-btn">← Back to Dashboard</a>
             <form action="/update_service/${service.id}" method="post" enctype="multipart/form-data">
                 <label class="form-label">Service Name:</label>
                <input type="text" value="${service.name}" name="name" class="form-control" required>

                <label class="form-label mt-2">Category:</label>
                <select name="category" value="${service.category}" class="form-control" required>
                    <option value="Events Management">Events Management</option>
                    <option value="Catering">Catering</option>
                    <option value="Jewelry Shop">Jewelry Shop</option>
                    <option value="Tech Gadgets">Tech Gadgets</option>
                    <option value="Plumbing">Plumbing</option>
                </select>

                <label class="form-label mt-2">Description:</label>
                <textarea name="description" class="form-control" required>${service.description}</textarea>

                <label class="form-label mt-2">Contact:</label>
                <input type="text" value="${service.contact}" name="contact" class="form-control" required>

                <label class="form-label mt-2">Base Image:</label>
                <input type="file" name="base_image" class="form-control" required>

                <label class="form-label mt-2">Additional Images:</label>
                <input type="file" name="image1" class="form-control">
                <input type="file" name="image2" class="form-control">
                <input type="file" name="image3" class="form-control">

                <label class="form-label mt-2">Social Media Handles (optional):</label>
                <input type="text" value="${service.social_media}" name="social_media" class="form-control">

                <label class="form-label mt-2">Website (optional):</label>
                <input type="text" value="${service.website}" name="website" class="form-control">

                 <button type="submit" class="btn btn-success w-100">Update Product </button>
            </form>
        </body>
        </html>`;

        res.send(productDetailsHTML);
    });
});

app.post('/update_service/:id',upload.fields([
    { name: 'base_image', maxCount: 1 },
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 }
]), (req, res) => {
       const base_image = req.files['base_image'] ? `/uploads/${req.files['base_image'][0].filename}` : null;
    const image1 = req.files['image1'] ? `/uploads/${req.files['image1'][0].filename}` : null;
    const image2 = req.files['image2'] ? `/uploads/${req.files['image2'][0].filename}` : null;
    const image3 = req.files['image3'] ? `/uploads/${req.files['image3'][0].filename}` : null;

const id=req.params.id
    const { name, category,description ,location,contact} = req.body;
   
  console.log(name)
    db.query(
        'UPDATE services SET name = ?, category = ?, base_image= ?, contact= ?, description = ? WHERE id = ?',
        [name, category, base_image, contact, description, id],
        (err, result) => {
            if (err) {
                console.error('Update service Error:', err);
                return res.status(500).json({ error: 'Error updating product' });
            }
            console.log('Update Result:', result);
                        res.redirect("/my-products")
        }
       
    );
})


// Server Start
app.listen(3000, () => console.log('Server running on port 3000'));
