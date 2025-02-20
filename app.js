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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));
const db = mysql.createConnection({
    host: 'freedbeccom-nexora.h.aivencloud.com',
    user: 'avnadmin',
	port:'14673',
    password: 'AVNS_rG5nsa4PxWCk-zHTBhl',
    
    
});

db.connect(err => {
    if (err) throw err;
    console.log('Connected to MySQL');

    db.query("CREATE DATABASE IF NOT EXISTS defaultdb", (err) => {
        if (err) throw err;
        console.log("Database created or exists");

        db.changeUser({ database: 'defaultdb' }, (err) => {
            if (err) throw err;
            
            const createUsers = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    username VARCHAR(50) NOT NULL UNIQUE,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    user_contact VARCHAR(50) NOT NULL,
                    seller_status VARCHAR(50) NOT NULL,
                    account_status VARCHAR(50) NOT NULL
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
                    product_category TEXT,
                    product_brand TEXT,
                    product_rating INT CHECK (product_rating BETWEEN 1 AND 5)
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
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'dashboard.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'views', 'register.html')));

app.post('/register', (req, res) => {
    const { username, email, password, contact} = req.body;
        
    bcrypt.hash(password, 10, (err, hash) => {
        db.query('INSERT INTO users (username, email, password, user_contact, seller_status, account_status) VALUES (?, ?, ?, ?, ?, ?)', 
            [username, email, hash, contact, 'not verified', 'not verified'], (err, result) => {
            if (err) throw err;
            res.redirect('/login');
        });
    });
});

app.post('/login', passport.authenticate('local', { successRedirect: '/dashboard', failureRedirect: '/login' }));

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: "dpgf8pzuo",
    api_key: "385877743365342",
    api_secret: "JtqBAwRyAxzuD379sH5PR1NM8vM"
});

// Configure Multer to use Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads', // Cloudinary folder name
        allowed_formats: ['jpg', 'jpeg', 'png' , 'webp'
        ,],
         quality: "auto",  // Cloudinary automatically adjusts the quality
    }
});
const upload = multer({ storage });



app.post('/add_product', upload.single('image'), (req, res) => {
    const { name, price, description, location, condition, category, brand } = req.body;
    const image = req.file ? req.file.path : null; // Cloudinary URL

    const seller_user = req.user.username;

    const sql = 'INSERT INTO products (name, price, image, seller_user, description, product_location, product_condition, product_category, product_brand, product_rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    db.query(sql, [name, price, image, seller_user, description, location, condition, category, brand,5], (err) => {
        if (err) throw err;
        res.redirect('/dashboard');
    });
});


app.get('/dashboard', (req, res) => {

    db.query('SELECT * FROM products', (err, products) => {
        if (err) throw err        

            res.sendFile(__dirname + "/views/dashboard.html"); // Load the HTML file
       
    });
});
app.get('/api/dashboard', (req, res) => {
    db.query('SELECT * FROM products', (err, products) => {
        if (err) throw err;

        db.query('SELECT * FROM products', (err, services) => {
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
                .price { font-size: 1.3em; font-weight: bold; color:  #4285F4; }
                .badge { font-size: 0.8em; padding: 3px 6px; border-radius: 5px; background: #e9ecef; }

                /* Buy Button */
                .buy-btn { width: 100%; font-size: 1em; padding: 8px; font-weight: bold; background-color:  #4285F4; border: none; color: #fff; border-radius: 5px; }
                .buy-btn:hover { background-color:  #4285F4; }
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
                    <span class="badge">${product.product_category || "Category"}</span>
                </div>

                <!-- Sections -->
                <div class="section">
                    <div class="section-title"><i class="fas fa-info-circle icon"></i> Description</div>
                    <p>${product.description || "No description available."}</p>
                </div>

                <div class="row-section">
                    <div>
                        <div class="section-title"><i class="fas fa-industry icon"></i> Brand</div>
                        <p>${product.product_brand || "No information available."}</p>
                    </div>
                    <div>
                        <div class="section-title"><i class="fas fa-box icon"></i> Condition</div>
                        <p>${product.product_condition || "No information available."}</p>
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





app.get('/search', (req, res) => {
    const query = req.query.query || '';
    const minPrice = req.query.minPrice || 0;
    const maxPrice = req.query.maxPrice || 1000000;
    const condition = req.query.condition || '%';

    const sql = `SELECT * FROM products WHERE name LIKE ? AND price BETWEEN ? AND ? AND product_condition LIKE ?`;
    db.query(sql, [`%${query}%`, minPrice, maxPrice, condition], (err, productResults) => {
        if (err) throw err;

        let productHTML = productResults.map(product => `
            <div class="card search-result-card mb-2 p-2">
                <div class="row g-2 align-items-center">
                    <div class="col-4">
                        <a href="/product/${product.id}" class="d-block">
                            <img src="${product.image}" class="img-fluid rounded shadow-sm product-image">
                        </a>
                    </div>
                    <div class="col-8 d-flex flex-column justify-content-between">
                        <a href="/product/${product.id}" class="text-decoration-none text-dark">
                            <p class=" product-title">${product.name}</p>
                        </a>
                        <p class="text-black fw-bold fs-6 mb-1">UGX ${product.price.toLocaleString()}</p>
                        <p class="badge text-start">${product.product_condition}</p>
                        <a href="/product/${product.id}" class="btn btn-sm btn-outline-primary mt-2">View</a>
                    </div>
                </div>
            </div>
        `).join('');

        res.send(`
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { font-family: Arial, sans-serif; background-color: #f8f9fa; }
                    .search-container { max-width: 95%; margin: auto; padding-top: 10px; }
                    .search-result-card { border-radius: 8px; background: white; transition: box-shadow 0.2s; }
                    .search-result-card:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
                    .product-title { font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
                    .search-filters { background: white; padding: 10px 15px; border-radius:5px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1); }
                    .product-image { height: 100px; object-fit: cover; width: 100%; }
                    @media (max-width: 576px) {
                        .product-title { font-size: 1.2rem;margin-bottom:2px;font-family:Arial;color:#616161;font-weight:500; }
                        .product-image { height: 80px; }
                        .btn-outline-primary { padding: 5px 10px; font-size: 0.8rem; }
                    .badge{color:#757575;background-color:white;font-size:14px;font-weight:400;}
                    }
                </style>
            </head>
            <body>
                <div class="search-container">
                    <h4 class="mb-3 text-center">Search Results for ${query}</h4>

                    <!-- Filter Section -->
                    <form action="/search" method="GET" class="search-filters mb-3">
                        <input type="hidden" name="query" value="${query}">
                        <div class="row g-2">
                            <div class="col-6">
                                <input type="number" name="minPrice" class="form-control" placeholder="Min Price" value="">
                            </div>
                            <div class="col-6">
                                <input type="number" name="maxPrice" class="form-control" placeholder="Max Price" value="">
                            </div>
                            <div class="col-6">
                                <select name="condition" class="form-select">
                                    <option value="%">All Conditions</option>
                                    <option value="New" ${condition === 'Brand New' ? 'selected' : ''}>New</option>
                                    <option value="Used" ${condition === 'Pre owned' ? 'selected' : ''}>Used</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <button type="submit" class="btn btn-primary w-100">Apply</button>
                            </div>
                        </div>
                    </form>

                    <!-- Results -->
                    ${productResults.length > 0 ? productHTML : '<p class="text-muted text-center">No results found.</p>'}
                </div>
            </body>
            </html>
        `);
    });
});


app.get('/my-products', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }

    const userId = req.user.username;

    db.query('SELECT * FROM products WHERE seller_user = ?', [userId], (err, products) => {
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
                    .navbar { background: #232f3e; padding: 10px; color: white; font-size: 18px; display: flex; align-items: center; }
                    .menu-icon { cursor: pointer; font-size: 24px; margin-right: 10px; }
                    .container { padding: 20px; }
                    .product-grid, .service-list { display: flex; flex-wrap: wrap; gap: 15px; }
                    .product-card, .service-item { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 45%; }
                    .product-card img, .service-item img { width: 100%; border-radius: 5px; }
                    .add-btn { display: block; text-align: center; background: #4285F4; color: white; padding: 10px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
                    .buttons { margin-top: 20px; text-align: center; }
                </style>
            </head>
            <body>

                <nav class="navbar">
                    <a href="/dashboard">
  <span class="menu-icon">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
    Back
  </span>
</a>  Seller Dashboard 
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
                       <a href="/delete_product/${product.id}" class="text-decoration-none"> <button>🗑 Delete</button></a>
                    </div>`;
            });                       

            html += `
                    </div>
                    <div class="buttons">
                        <a href="/add_product" class="add-btn">➕ Add Product</a>
                      </div>
                </div>`                
                res.send(html)
                
})                

})
  
  app.post('/update_product/:id', upload.single('image'), (req, res) => {
    const id = req.params.id;
    const { name, price, description, location, condition } = req.body;

    // Step 1: Fetch existing product details
    db.query('SELECT * FROM products WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error('Error fetching product:', err);
            return res.status(500).json({ error: 'Error fetching product details' });
        }
        
        if (results.length === 0) return res.send("Product not found");

        let product = results[0];
        let oldImageUrl = product.image; // Existing image URL

        // Step 2: Check if a new image was uploaded
        if (req.file) {
            // Upload new image to Cloudinary
            cloudinary.uploader.upload(req.file.path, (cloudErr, cloudResult) => {
                if (cloudErr) {
                    console.error("Cloudinary upload error:", cloudErr);
                    return res.status(500).json({ error: "Error uploading to Cloudinary" });
                }

                let newImageUrl = cloudResult.secure_url; // New Cloudinary image URL

                // Step 3: Delete old image from Cloudinary (if applicable)
                if (oldImageUrl.includes("cloudinary")) {
                    let publicId = oldImageUrl.split('/').pop().split('.')[0]; // Extract public ID

                    cloudinary.uploader.destroy(publicId, (deleteErr, deleteResult) => {
                        if (deleteErr) console.error("Cloudinary delete error:", deleteErr);
                        console.log("Cloudinary delete result:", deleteResult);

                        // Step 4: Update database with new image URL
                        updateProductInDB(id, name, price, newImageUrl, description, location, condition, res);
                    });
                } else {
                    // If old image wasn't from Cloudinary, just update DB
                    updateProductInDB(id, name, price, newImageUrl, description, location, condition, res);
                }
            });
        } else {
            // No new image uploaded, just update other fields
            updateProductInDB(id, name, price, oldImageUrl, description, location, condition, res);
        }
    });
});

// Function to update the product in the database
function updateProductInDB(id, name, price, image, description, location, condition, res) {
    db.query(
        'UPDATE products SET name = ?, price = ?, image = ?, description = ?, product_location = ?, product_condition = ? WHERE id = ?',
        [name, price, image, description, location, condition, id],
        (err, result) => {
            if (err) {
                console.error('Update Product Error:', err);
                return res.status(500).json({ error: 'Error updating product' });
            }
            console.log('Update Result:', result);
            res.redirect("/my-products");
        }
    );
}
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
app.get('/delete_product/:id', (req, res) => {
    let productId = req.params.id;
    db.query('SELECT * FROM products WHERE id = ?', [productId], (err, results) => {
        if (err) throw err;
        if (results.length === 0) return res.send("Product not found");

        let product = results[0];

        let deleteConfirmHTML = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>Delete ${product.name}?</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
            <style>
                body { background-color: #f8f9fa; font-family: Arial, sans-serif; }
                .container { max-width: 500px; margin: auto; text-align: center; padding-top: 50px; }
                .warning { color: red; font-weight: bold; }
                .btn-container { margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Are you sure you want to delete?</h2>
                <p class="warning">"${product.name}" will be permanently removed.</p>
                <div class="btn-container">
                    <a href="/confirm_delete_product/${product.id}" class="btn btn-danger">Delete</a>
                    <a href="/dashboard" class="btn btn-secondary">Cancel</a>
                </div>
            </div>
        </body>
        </html>`;

        res.send(deleteConfirmHTML);
    });
});


app.get('/confirm_delete_product/:id', (req, res) => {
    const productId = req.params.id;

    // Step 1: Get the product details (including image URL)
    db.query('SELECT * FROM products WHERE id = ?', [productId], (err, results) => {
        if (err) {
            console.error("Error fetching product:", err);
            return res.status(500).send("Error fetching product details.");
        }
        
        if (results.length === 0) return res.send("Product not found");

        const product = results[0];
        const imageUrl = product.image;

        // Step 2: Extract Cloudinary public ID (if image is stored on Cloudinary)
        if (imageUrl.includes('cloudinary')) {
            const publicId = imageUrl.split('/').pop().split('.')[0]; // Extracts the public ID from the URL

            cloudinary.uploader.destroy(publicId, (cloudErr, cloudResult) => {
                if (cloudErr) console.error("Cloudinary delete error:", cloudErr);
                console.log("Cloudinary delete result:", cloudResult);

                // Step 3: Delete the product from the database
                db.query('DELETE FROM products WHERE id = ?', [productId], (dbErr, dbResult) => {
                    if (dbErr) {
                        console.error("Database delete error:", dbErr);
                        return res.status(500).send("Error deleting product.");
                    }

                    console.log("Product deleted successfully.");
                    res.redirect('/dashboard'); // Redirect after deletion
                });
            });
        } else {
            // If the image is stored locally, delete the product directly
            db.query('DELETE FROM products WHERE id = ?', [productId], (dbErr, dbResult) => {
                if (dbErr) {
                    console.error("Database delete error:", dbErr);
                    return res.status(500).send("Error deleting product.");
                }

                console.log("Product deleted successfully.");
                res.redirect('/dashboard'); // Redirect after deletion
            });
        }
    });
});




// Server Start
app.listen(3000, () => console.log('Server running on port 3000'));
