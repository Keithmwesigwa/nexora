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
app.use(express.json());


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

function handleDisconnect() {
  db.connect(err => {
    if (err) {
      console.error('Error connecting to DB:', err);
      setTimeout(handleDisconnect, 2000); // Retry after 2s
    }
  });
}
  db.on('error', err => {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.warn('Reconnecting due to lost connection...');
      handleDisconnect();
    } else {
      throw err;
    }
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
                    sizes TEXT,
                    colours TEXT,
                    price DECIMAL(10,2) NOT NULL,
                    image VARCHAR(255),
                    image2 VARCHAR(255),
                    image3 VARCHAR(255),
                    image4 VARCHAR(255),
                    product_category TEXT,
                    product_brand TEXT,  
                     stock INT   )
            `;

            const createReviews = `
                CREATE TABLE IF NOT EXISTS reviews (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    product_id INT NOT NULL,
                    user_id TEXT,
                    rating INT CHECK (rating BETWEEN 1 AND 5),
                    comment TEXT
                     )
            `;
             const createCart = `
               CREATE TABLE IF NOT EXISTS cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username TEXT, 
    product_id INT NOT NULL,
    colour TEXT,
    size TEXT,
    quantity INT DEFAULT 1
    
    );
            `;
            const createOrders = `
               CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username TEXT,
    country TEXT,
    city TEXT,
    street TEXT,
     colour TEXT,
    size TEXT,
    product_id INT NOT NULL,
    price INT,
    payment_status TEXT,
    order_status TEXT,
    quantity INT DEFAULT 1
  
    );
            `;
            
const createCarts ='DROP TABLE cart'
const createCartf=`ALTER TABLE products
ADD COLUMN stock INT;`
            db.query(createUsers, (err) => { if (err) throw err; });
            db.query(createProducts, (err) => { if (err) throw err; });
            db.query(createReviews, (err) => { if (err) throw err; });
            db.query(createCart, (err) => { if (err) throw err; });
     db.query(createOrders, (err) => { if (err) throw err; });

         
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
app.get('/faq', (req, res) => res.sendFile(path.join(__dirname, 'views', 'faq.html')));
app.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/dashboard'); // redirect wherever you want after logout
  });
});
app.get('/tac', (req, res) => res.sendFile(path.join(__dirname, 'views', 'tac.html')));
app.get('/pp', (req, res) => res.sendFile(path.join(__dirname, 'views', 'pp.html')));
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





app.post('/add_product', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), async (req, res) => {
    const { name, price, description, sizes, colours, category, brand } = req.body;
    const seller_user = req.user.username;

    try {
        // Upload images to Cloudinary and get their URLs
        const image = req.files['image'] ? await uploadToCloudinary(req.files['image'][0].path) : null;
        const image2 = req.files['image2'] ? await uploadToCloudinary(req.files['image2'][0].path) : null;
        const image3 = req.files['image3'] ? await uploadToCloudinary(req.files['image3'][0].path) : null;
        const image4 = req.files['image4'] ? await uploadToCloudinary(req.files['image4'][0].path) : null;

        // Insert product data into the database
        const sql = 'INSERT INTO products (name, price, image, image2, image3, image4, seller_user, description, sizes, colours, product_category, product_brand) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
        db.query(sql, [name, price, image, image2, image3, image4, seller_user, description, sizes, colours, category, brand], (err) => {
            if (err) throw err;
            res.redirect('/dashboard');
        });
    } catch (error) {
        console.error('Error uploading images to Cloudinary:', error);
        res.status(500).send('Error uploading images');
    }
});

// Helper function to upload a file to Cloudinary
const uploadToCloudinary = async (filePath) => {
    try {
        const result = await cloudinary.uploader.upload(filePath);
        return result.secure_url; // Return the secure URL of the uploaded image
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
};

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


app.get('/api/cart/count', (req, res) => {
    if (req.isAuthenticated()) {  // Ensure user is authenticated
        let usernam = req.user.username;  

        db.query('SELECT * FROM cart WHERE username = ?', [usernam], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({ count: results.length });  // Return count, not results
        });
    } else {
        res.json({ count: 0 });  // If not authenticated, return 0
    }
});
 
 app.get('/api/item/count/:product_id', (req, res) => {
    if (req.isAuthenticated()) {  // Ensure user is authenticated
        let user_id = req.user.username;  
const {product_id } = req.params;
      const checkQuery = 'SELECT * FROM cart WHERE username = ? AND product_id = ?';
    db.query(checkQuery, [user_id, product_id], (err, results) => {
        if (err) return res.status(500).send(err);

        if (results.length > 0) {
console.log(results[0].quantity)
            res.json({ count: results[0].quantity });  // Return count, not results
        
   }
   else{
       res.json({ count: 0});
   }
   })
   
   
   
   
    } else {
        res.json({ count: 0 });  // If not authenticated, return 0
    }
});
 
 

 


app.get('/add_product', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'views', 'add-product.html'));
});
//services

app.get('/product/:id', (req, res) => {
    let productId = req.params.id;

    // Fetch product details
    db.query('SELECT * FROM products WHERE id = ?', [productId], (err, productResults) => {
        if (err) throw err;
        if (productResults.length === 0) return res.send("Product not found");

        let product = productResults[0];
        let username = req.user ? req.user.username : null;

let cartItemCount = 0;
            if (username) {
                db.query('SELECT COUNT(*) AS count FROM cart WHERE username = ?', [username], (err, cartResults) => {
                    if (err) throw err;
                    cartItemCount = cartResults[0].count;

                        });
}

        // Fetch reviews for the product
        db.query('SELECT * FROM reviews WHERE product_id = ?', [productId], (err, reviewResults) => {
            if (err) throw err;

            let availableColors = product.colours ? product.colours.split(",") : [];  // Example: "Red,Blue,Black"
            let availableSizes = product.sizes ? product.sizes.split(",") : [];  // Example: "S,M,L,XL"

            // Color Options with Modern UI
            let colorOptions = availableColors.map(color => 
                `<button class="color-option" style="background: ${color};" onclick="selectColor('${color}')"></button>`
            ).join('');

            // Size Options with Modern UI
            let sizeOptions = availableSizes.map(size => 
                `<div class="size-option" onclick="selectSize('${size}')">${size}</div>`
            ).join('');

            // Image Carousel
            const images = [product.image, product.image2, product.image3, product.image4].filter(img => img); // Filter out null/undefined images
            const carouselIndicators = images.map((_, index) => 
                `<button type="button" data-bs-target="#productCarousel" data-bs-slide-to="${index}" class="${index === 0 ? 'active' : ''}" aria-current="${index === 0 ? 'true' : ''}" aria-label="Slide ${index + 1}"></button>`
            ).join('');

            const carouselItems = images.map((img, index) => 
                `<div class="carousel-item ${index === 0 ? 'active' : ''}">
                    <img src="${img}" class="d-block w-100" alt="Product Image ${index + 1}">
                </div>`
            ).join('');

            // Calculate average rating
            let totalRating = reviewResults.reduce((sum, review) => sum + review.rating, 0);
            let averageRating = reviewResults.length > 0 ? (totalRating / reviewResults.length).toFixed(1) : 0;

            // Generate star rating HTML
            const generateStars = (rating) => {
                let stars = '';
                for (let i = 1; i <= 5; i++) {
                    stars += `<i class="fas fa-star ${i <= rating ? 'text-warning' : 'text-secondary'}"></i>`;
                }
                return stars;
            };

            // Reviews HTML
            const reviewsHTML = reviewResults.map(review => `
                <div class="review-card mb-3 p-3 border rounded">
                    <div class="d-flex justify-content-between">
                        <strong style="font-family: 'Montserrat', sans-serif;">${review.user_id}</strong>
                        <div>${generateStars(review.rating)}</div>
                    </div>
                    <p style="font-family: 'Montserrat', sans-serif;" class="mt-2">${review.comment || "No comment provided."}</p>
                </div>
            `).join('');

            // Product Details HTML
            let productDetailsHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${product.name} - Gera Jewels</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
       
body {
      font-family: 'Montserrat', sans-serif;
      margin: 0;
      background: #fff;
      color: #333;
    }
        /* Sidebar */
        .sidebar {
            position: fixed;
            top: 0;
            left: -250px;
            width: 250px;
            height: 100%;
            background: #fff;
            box-shadow: 2px 0px 5px rgba(0, 0, 0, 0.2);
            transition: 0.3s;
            z-index: 1000;
            padding-top: 60px;
        }
        .sidebar.active { left: 0; }
        .sidebar ul { list-style: none; padding: 0; margin: 0; }
        .sidebar ul li { padding: 15px 20px; border-bottom: 1px solid #ddd; }
        .sidebar ul li a { text-decoration: none; color: #333; display: flex; align-items: center; }
        .sidebar ul li a i { margin-right: 10px; }

        /* Overlay */
        .overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            display: none;
        }
        .overlay.active { display: block; }

       /* Navbar */
        .navbar { 
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 1001; 
            background: #fff; 
            padding: 10px 15px;
            display: flex;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .navbar .menu-icon { 
            cursor: pointer; 
            color: black; 
            font-size: 24px; 
            margin-right: 15px;
        }
        .navbar .cart-icon { 
        width:25px;
        height:25px;
            cursor: pointer; 
            margin-left: auto; 
            color: black; 
            font-size: 24px; 
            position: relative;
        }
        .navbar .cart-count {
            position: absolute;
            top: 5px;
            right: 1px;
            background: #004d40; /* Changed to blue */
            color: white;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 50%;
             /* Hidden by default */
        }
      .navbar .navbar-brand { 
    color: #000; 
    font-size: 22px; 
    font-weight: 500;         /* medium, not too bold */
    font-family: 'Playfair Display', serif; /* elegant serif */
    letter-spacing: 1px;      /* adds spacing for luxury feel */
    text-transform: uppercase; /* gives a premium identity */
}


        /* Main Content */
        .main-content {
            margin-top: 70px; /* Adjusted for fixed navbar */
            padding: 20px;
        }

        /* Color Options */
        .color-options {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .color-option {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid #ddd;
            transition: transform 0.2s, border-color 0.2s;
        }
        .color-option.selected {
            border-color: #000;
            transform: scale(1.1);
        }

        /* Size Options */
        .size-options {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .size-option {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.2s, border-color 0.2s;
        }
        .size-option.selected {
            background-color: #f0f0f0;
            border-color: #000;
        }

        /* Info Cards */
            .info-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            margin-top: 10px;
            background: #fff;
           /* box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);*/
        }
        .info-card i {
            font-size: 1.2em;
            margin-bottom: 5px;
            color: #555;
        }
        .info-card h5 {
            font-size: 1em;
            font-weight: bold;
        }
        .info-card p {
            font-size: 0.9em;
            color: #555;
        }

      
    /* Footer */
    .footer {
      background: #212121;
      color: #e0e0e0;
      padding: 50px 20px;
      margin-top: 50px;
    }
    .footer-container {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
    }
    .footer h3, .footer h4 {
      color: #fff;
      font-family: 'Playfair Display', serif;
    }
    .footer-links ul, .footer-support ul { list-style: none; padding: 0; margin: 0; }
    .footer-links a, .footer-support a {
      color: #bdbdbd; text-decoration: none; font-size: 14px;
    }
    .footer-links a:hover, .footer-support a:hover { color: #ffd700; }
    .footer-newsletter input[type="email"] {
      padding: 10px; border-radius: 25px; border: none; width: 60%; margin-right: 10px;
    }
    .footer-newsletter button {
      padding: 10px 20px; border: none; border-radius: 25px;
      background: #ffd700; color: #212121; font-weight: 600;
    }
    .footer-bottom {
      border-top: 1px solid #333;
      margin-top: 30px;
      padding-top: 20px;
      display: flex; justify-content: space-between; flex-wrap: wrap;
      font-size: 13px;
    }
    .social-links a { color: #bdbdbd; margin: 0 8px; }
    .social-links a:hover { color: #ffd700; }


        /* Responsive Adjustments */
        @media (max-width: 768px) {
            .sidebar { left: -250px; }
            .sidebar.active { left: 0; }
        }
        @media (min-width: 769px) {
            .sidebar { left: 0; }
            .menu-icon { display: none; }
            .main-content { margin-left: 250px; }
        }
         /* Add to Cart Button */
        .buy-btn {
            width: 100%;
            padding: 12px;
            font-size: 1.2em;
            font-family: 'Montserrat', sans-serif;
    font-weight: 500;
            background:#004d40;
            border: none;
            color: white;
            border-radius: 5px;
            font-weight: bold;
            margin-top: 15px;
            transition: background-color 0.2s;
        }
           .navbar .cart-badge {
            position: absolute;
            top: 5px;
            right: 5px;
            background: #007bff;
            color: white;
            border-radius: 50%;
            padding: 2px 6px;
            font-size: 12px;
        }
        
        /* Collapsible FAQ Section */
        .faq-item {
            border-bottom: 1px solid #ddd;
            padding: 10px 0;
        }
        .faq-question {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            font-family: 'Montserrat', sans-serif;
            font-weight: bold;
        }
        .faq-question i {
            transition: transform 0.2s;
        }
        .faq-question.active i {
            transform: rotate(45deg);
        }
        .faq-answer {
            display: none;
            padding-top: 10px;
            font-size: 1em;
            color: #555;
            font-family: 'Montserrat', sans-serif;
        }
         .pname{
            font-family: 'Montserrat', sans-serif;
    font-weight: 600;
            font-size: 17px;
            
            color: #313131; /* eBay-like price color */
            margin-bottom: 0.2rem;
        }
         .price {
            font-family: 'Montserrat', sans-serif;
    font-weight: 600;
            font-size: 20px;
            
            color: #212121; /* eBay-like price color */
            margin-bottom: 0.2rem;
        }
        .description {
            font-family: 'Montserrat', sans-serif;
font-weight: 500;
    
            font-size: 15px;
            line-height: 1.5;
            color: #424242;
        }
           .opt{
            font-family: 'Montserrat', sans-serif;
    font-weight: 400;
            font-size: 0.9rem;
            
            color: #212121; /* eBay-like price color */
            margin-bottom: 0.2rem;
        }
          .et{
            font-family: 'Montserrat', sans-serif;
    font-weight: 400;
            font-size: 0.9rem;
            
            color: #212121; /* eBay-like price color */
            margin-bottom: 0.2rem;
        }
        
        
          /* label/title */
    .field {
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-width: 720px;
    }

    .field-label {
      font-size: 48px;         /* large like your screenshot */
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
      display: inline-flex;
      align-items: baseline;
      gap: 8px;
    }

    .field-label .required {
      font-size: 30px;
      color: var(--accent);
      margin-left: 6px;
    }

    /* the quantity box */
    .qty-box {
      width: 400px;            /* tune this to match your visual */
      
      padding: 26px 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
      background: white;
      margin-top: 6px;
      border:#212121 1px solid;
    }

    /* buttons and number */
    .qty-btn {
      background: transparent;
      border: none;
      font-size: 20px;
      line-height: 1;
      width: 54px;
      height: 54px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      user-select: none;
    }

    .qty-btn:focus {
      outline: 3px solid rgba(0,0,0,0.12);
      outline-offset: 2px;
      border-radius: 6px;
    }

    .qty-value{
      font-size: 17px;
      font-weight: 600;
      min-width: 48px;
      text-align: center;
    }

    /* smaller screens make it scale */
    @media (max-width:520px){
      .field-label { font-size: 20px; }
      .qty-box{ width:100%; padding:18px; }
      .qty-btn{ font-size:25px; width:44px; height:25px; }
      .qty-value{ font-size:20px; }
    } 
        
        
    </style>
</head>
<body>

    <!-- Navbar -->
    <nav class="navbar">
        <span class="menu-icon" onclick="toggleMenu()"><i class="fas fa-bars"></i></span>
        <span class="navbar-brand">Gera Jewels</span>
        <span  class="search-icon" ><a style="text-decoration:none;color:black;"href="/search" ><i class="fas fa-search"></i></a></span>
        <a href="/cart/get">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.0" stroke="currentColor" class="cart-icon">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  <span class="cart-count" id="cart-count">0</span>
</svg>
       
        </a> </nav>

    <!-- Sidebar -->
    <div id="sidebar-menu" class="sidebar">
    <ul>
      <li><a class="active" href="/dashboard"><i class="fas fa-home"></i>Shop</a></li>
      
      <li><a href="/orders"><i class="fas fa-truck"></i> My Orders</a></li>
      <li><a href="/tac"><i class="fas fa-file-contract"></i> Terms & Conditions</a></li>
      <li><a href="/logout"><i class="fas fa-right-from-bracket"></i>Logout</a></li>
    </ul>
    </div>

    <!-- Overlay -->
    <div id="overlay" class="overlay" onclick="toggleMenu()"></div>

    <!-- Main Content -->
    <div class="main-content">
        <!-- Product Details -->
        <div class="container mt-4">
            <div class="product-details">
                <!-- Image Carousel -->
                <div class="product-images">
                    <div id="productCarousel" class="carousel slide" data-bs-ride="carousel">
                        <div class="carousel-indicators">
                            ${carouselIndicators}
                        </div>
                        <div class="carousel-inner">
                            ${carouselItems}
                        </div>
                        <button class="carousel-control-prev" type="button" data-bs-target="#productCarousel" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Previous</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#productCarousel" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Next</span>
                        </button>
                    </div>
                </div>

                <!-- Product Information -->
                <div class="product-info">
                    <p class="pname">${product.name}</p>
                    <p class="price">UGX ${product.price}</p>
                    <p class="description">${product.description || "No description available."}</p>

                    <!-- Color Selection -->
                    ${availableColors.length > 0 ? `
                    <div>
                        <p class="opt">Select Color:</strong>
                        <div class="color-options">${colorOptions}</div>
                    </div>` : ''}

                    <!-- Size Selection -->
                    ${availableSizes.length > 0 ? `
                    <div style="display:none;">
                        <p class="opt">Select Size:</p>
                        <div class="size-options">${sizeOptions}</div>
                    </div>` : ''}


  <form id="qbs" class="field" onsubmit="return false;">
    <label class="field-label" for="quantity">
      Quantity
      <span class="required">*</span>
    </label>

    <div id="qty-box"class="qty-box" role="group" aria-labelledby="quantity-label">
      <button onclick="updateQuantity(${productId}, -1)" type="button" class="qty-btn" id="decrease" aria-label="Decrease quantity">−</button>
      <div id="quantity" class="qty-value" role="status" aria-live="polite">0</div>
      <button onclick="updateQuantity(${productId}, 1)" type="button" class="qty-btn" id="increase" aria-label="Increase quantity">+</button>
    
    </div>
  </form>
  




<a href="#" class="buy-btn-link">
  <button id="buy-btn" class="buy-btn">Add to Cart</button>
                    
</a>

                    <!-- FAQ Section -->
                    <div class="mt-4">
                        <h4 style="font-family: 'Montserrat', sans-serif;">Frequently Asked Questions</h4>
                        <div class="faq-item">
                            <div class="faq-question" onclick="toggleFAQ(this)">
                                What is the return policy? <i class="fas fa-plus"></i>
                            </div>
                            <div class="faq-answer">
                                You can return the product within 7 days of purchase for a full refund.
                            </div>
                        </div>
                        <div class="faq-item">
                            <div class="faq-question" onclick="toggleFAQ(this)">
                                How long does shipping take? <i class="fas fa-plus"></i>
                            </div>
                            <div class="faq-answer">
                                Delivery typically takes 1-2 business days.
                            </div>
                        </div>
                        <div class="faq-item">
                            <div class="faq-question" onclick="toggleFAQ(this)">
                                Is the payment secure? <i class="fas fa-plus"></i>
                            </div>
                            <div class="faq-answer">
                                Yes, we use SSL encryption to protect your payment information.
                            </div>
                        </div>
                    </div>

                    <!-- Info Cards -->
                    <div class="info-card">
                        <i class="fas fa-truck"></i>
                        <h5 style="font-family: 'Montserrat', sans-serif;">Delivery</h5>
                        <p class="et">You required to pay extra for delivery </p>
                    </div>
                    
                   
                    <!-- Rating Section -->
                    <div class="mt-4">
                        <h4 style="font-family: 'Montserrat', sans-serif;">Customer Reviews</h4>
                        <div class="et d-flex align-items-center mb-3">
                            <div class="star-rating me-2">
                                ${generateStars(averageRating)}
                            </div>
                            <span class="text-muted">${averageRating} out of 5 (${reviewResults.length} reviews)</span>
                        </div>
                        ${reviewsHTML}
                    </div>

                    <!-- Comment and Rating Form (for logged-in users) -->
                    ${username ? `
                    <div class="mt-4">
                        <h4>Add a Review</h4>
                        <form action="/add-review" method="POST">
                            <input type="hidden" name="product_id" value="${product.id}">
                            <div class="mb-3">
                                <label for="rating" class="form-label">Rating</label>
                                <select class="form-select" name="rating" id="rating" required>
                                    <option value="5">5 Star</option>
                                    <option value="4">4 Stars</option>
                                    <option value="3">3 Stars</option>
                                    <option value="2">2 Stars</option>
                                    <option value="1">1 Stars</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="comment" class="form-label">Comment</label>
                                <textarea class="form-control" name="comment" id="comment" rows="3" required></textarea>
                            </div>
                            <button style="background:#004d40;border:none;outline:none;" type="submit" class="btn btn-primary">Submit Review</button>
                        </form>
                    </div>` : '<p class="text-muted">Please <a href="/login">log in</a> to leave a review.</p>'}
                </div>
            </div>
        </div>
    </div>

   <!-- Footer -->
  <footer class="footer">
    <div class="footer-container">
      <div class="footer-brand">
        <h3>Gera Jewels</h3>
        <p>Exquisite craftsmanship. Timeless elegance.</p>
      </div>
      <div class="footer-links">
        <h4>Quick Links</h4>
        <ul>
          <li><a href="/dashboard">Shop</a></li>       
          <li><a href="/pp">Privacy Policy</a></li>
          <li><a href="/tac">Terms of Service</a></li>
        </ul>
      </div>
      <div class="footer-support">
        <h4>Customer Service</h4>
        <ul>
          <li><a href="/faq">FAQ</a></li>
          <li><a href="/faq">Shipping & Delivery</a></li>
          
        </ul>
      </div>
      <div style="display:none;" class="footer-newsletter">
        <h4>Stay Updated</h4>
        <p>Subscribe for latest collections & exclusive offers.</p>
        <form action="/subscribe" method="POST">
          <input type="email" name="email" placeholder="Your email" required>
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2025 Gera Jewels. All rights reserved.</p>
      <div class="social-links">
        <a href="#"><i class="fab fa-facebook-f"></i></a>
        <a href="#"><i class="fab fa-instagram"></i></a>
        <a href="#"><i class="fab fa-twitter"></i></a>
      </div>
    </div>
  </footer>

    <!-- JavaScript -->
    <script>
    
    
    async function updateQuantity(productId, change) {
                                const qtyElement = document.getElementById('quantity');
                                const newQty = parseInt(qtyElement.innerText) + change;

                                if (newQty < 1) {
                                    deleteItem(productId)
  } // Prevent quantity from going below 1
else{
                                const response = await fetch('/cart/update', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ productId, change })
                                });

                                if (response.ok) {
                                    qtyElement.innerText = newQty;
                                    
                                }
                                
                                
     }                           
                                
                            }
                            
    
    async function deleteItem(productId) {
                                      const qtyElement = document.getElementById('quantity');
                                const response = await fetch('/cart/delete', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ productId })
                                });

                                if (response.ok) {
                                    location.reload(); // Reload after deletion
                                }
                            }
    
    
        
  function  togglequantity(){
     let  qb=document.getElementById('qbs')
     let cbn=document.getElementById('buy-btn')
     const qnt = parseInt(document.getElementById('quantity').innerText)
     if (qnt>0){
         cbn.style.display="none"
         qb.style.display="block"
     }
    else{
        
         qb.style.display="none"
         cbn.style.display="block"
     }
   } 
    
    
    
    
    
    fetchCartCount()

    
    
    
    
      // Fetch Cart Count
        async function fetchCartCount() {
            try {
                const res = await fetch('/api/cart/count');
                const data = await res.json();
                const cartCount = document.getElementById('cart-count');
                if (data.count > 0) {
                    cartCount.textContent = data.count;
                    cartCount.classList.add('show');
                } else {
                    cartCount.classList.remove('show');
                }
            } catch (error) {
                console.error('Error fetching cart count:', error);
            }
        }
    productCount()
      // Fetch Cart Count
        async function productCount() {
            try {
                const res = await fetch('/api/item/count/${product.id}');
                const data = await res.json();
                const cartCount = document.getElementById('quantity');
                if (data.count > 0) {
                    cartCount.textContent = data.count;
                    cartCount.classList.add('show');
                    togglequantity()
                } else {
                    cartCount.textContent = 0;
                    cartCount.classList.add('show');
                   togglequantity() 
                    
                }
            } catch (error) {
                console.error('Error fetching cart count:', error);
            }
        }
    
    
        // Toggle Sidebar
        function toggleMenu() {
            let sidebar = document.getElementById('sidebar-menu');
            let overlay = document.getElementById('overlay');
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        }

        // Select Color
        function selectColor(color) {
            document.querySelectorAll('.color-option').forEach(btn => btn.classList.remove('selected'));
            event.target.classList.add('selected');
            updateAddToCartUrl();
        }

        // Select Size
        function selectSize(size) {
            document.querySelectorAll('.size-option').forEach(btn => btn.classList.remove('selected'));
            event.target.classList.add('selected');
            updateAddToCartUrl();
        }
// Toggle FAQ Answer
        function toggleFAQ(element) {
            const answer = element.nextElementSibling;
            const icon = element.querySelector('i');
            if (answer.style.display === 'block') {
                answer.style.display = 'none';
                icon.classList.remove('active');
            } else {
                answer.style.display = 'block';
                icon.classList.add('active');
            }
        }

        // Update Add to Cart URL
        function updateAddToCartUrl() {
            // Get selected color
            const selectedColor = document.querySelector('.color-option.selected') ? 
                document.querySelector('.color-option.selected').style.backgroundColor : '';

            // Get selected size
            const selectedSize = document.querySelector('.size-option.selected') ? 
                document.querySelector('.size-option.selected').innerText : '';

            // Construct the new URL
            const baseUrl = '/cart/add/${username}/${product.id}/1';
            const params = new URLSearchParams();
            if (selectedColor) params.append('color', selectedColor);
            if (selectedSize) params.append('size', selectedSize);
            const newUrl = baseUrl + '?' + params.toString();

            // Update the "Add to Cart" button's href
            document.querySelector('.buy-btn-link').href = newUrl;
        }

        // Initial call to set the URL
        updateAddToCartUrl();
    </script>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;

            res.send(productDetailsHTML);
        });
    });
});



app.get('/search', (req, res) => {
    const query = req.query.query || '';
    const minPrice = req.query.minPrice || 0;
    const maxPrice = req.query.maxPrice || 1000000;
    const condition = req.query.condition || '%';

    const sql = `SELECT * FROM products WHERE name LIKE ? AND price BETWEEN ? AND ? AND product_category LIKE ?`;
    db.query(sql, [`%${query}%`, minPrice, maxPrice, condition], (err, productResults) => {
        if (err) throw err;

        // Generate a heading based on the condition
        let heading = `Search Results for "${query}"`;
        if (condition !== '%') {
            heading = `Searching in ${condition}`;
        }

        let productHTML = productResults.map(product => `
            <a href="/product/${product.id}" class="card search-result-card mb-2 p-2 text-decoration-none text-dark">
                <div class="row g-2 align-items-center">
                    <div class="col-4">
                        <img src="${product.image}" class="img-fluid rounded shadow-sm product-image">
                    </div>
                    <div class="col-8 d-flex flex-column justify-content-between">
                        <p class="product-title">${product.name}</p>
                        <p style="font-family: 'Montserrat', sans-serif;" class="text-black fw-bold fs-6 mb-1">UGX ${product.price.toLocaleString()}</p>
                       
                    </div>
                </div>
            </a>
        `).join('');

        res.send(`
            <html>
            <head>
                <title>Search - Gera Jewels</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
                 <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    body {
      font-family: 'Montserrat', sans-serif;
      margin: 0;
      background: #fff;
      color: #333;
    }
                    /* Navbar */
        .navbar { 
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 1001; 
            background: #fff; 
            padding: 10px 15px;
            display: flex;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .navbar .menu-icon { 
            cursor: pointer; 
            color: black; 
            font-size: 24px; 
            margin-right: 15px;
        }
        .navbar .cart-icon { 
        width:25px;
        height:25px;
            cursor: pointer; 
            margin-left: auto; 
            color: black; 
            font-size: 24px; 
            position: relative;
        }
        .navbar .cart-count {
            position: absolute;
            top: 5px;
            right: 1px;
            background: #004d40; /* Changed to blue */
            color: white;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 50%;
             /* Hidden by default */
        }
      .navbar .navbar-brand { 
    color: #000; 
    font-size: 22px; 
    font-weight: 500;         /* medium, not too bold */
    font-family: 'Playfair Display', serif; /* elegant serif */
    letter-spacing: 1px;      /* adds spacing for luxury feel */
    text-transform: uppercase; /* gives a premium identity */
}
                    .search-container { max-width: 95%; margin: 80px auto 20px; padding-top: 10px; }
                    .search-result-card { border-radius: 8px; background: white; transition: box-shadow 0.2s; }
                    .search-result-card:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
                    .product-title { font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; font-family: 'Montserrat', sans-serif;}
                    .product-image { height: 100px; object-fit: cover; width: 100%; }
               
                    .search-bar { position: relative; margin-bottom: 20px; }
                    .search-bar input { width: 100%; padding: 10px 40px 10px 15px; border-radius: 0px; border: 1px solid #212121; font-size: 14px;font-family: 'Montserrat', sans-serif; }
                    .search-bar .search-icon { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #424242; }
                    .filter-button { background:  #004d40; color: white; border: none; padding: 8px 15px; border-radius: 25px; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 5px; }
                    .filter-button i { font-size: 14px; }
                    .filter-area { display: none; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1); margin-bottom: 20px; animation: slideDown 0.3s ease; }
                    .filter-area.active { display: block; }
                    .filter-section { margin-bottom: 15px; }
                    .filter-section label { font-weight: 500; color: #333; margin-bottom: 5px; }
                    .filter-section input, .filter-section select { width: 100%; padding: 8px; border-radius: 5px; border: 1px solid #ddd; font-size: 14px; }
                    .filter-section input:focus, .filter-section select:focus { border-color: #007bff; outline: none; }
                    .btn-apply { background:  #004d40; color: white; border: none; padding: 10px; border-radius: 5px; cursor: pointer; width: 100%; }
                    .btn-apply:hover { background:  #004d40; }
                    .close-filter { text-align: right; margin-bottom: 10px; }
                    .close-filter button { background: none; border: none; color: #007bff; cursor: pointer; font-size: 14px; }

                    /* Sidebar */
                    .sidebar {
                        position: fixed;
                        top: 60px; /* Below the app bar */
                        left: -250px;
                        width: 250px;
                        height: calc(100% - 60px); /* Adjust height to fit below app bar */
                        background: #fff;
                        box-shadow: 2px 0px 5px rgba(0, 0, 0, 0.2);
                        transition: 0.3s;
                        z-index: 1000;
                        padding-top: 20px;
                    }
                    .sidebar.active { left: 0; }
                    .sidebar ul { list-style: none; padding: 0; margin: 0; }
                    .sidebar ul li { padding: 15px 20px; border-bottom: 1px solid #ddd; }
                    .sidebar ul li a { text-decoration: none; color: #333; display: flex; align-items: center; }
                    .sidebar ul li a i { margin-right: 10px; }

                    /* Overlay */
                    .overlay {
                        position: fixed;
                        top: 60px; /* Below the app bar */
                        left: 0;
                        width: 100%;
                        height: calc(100% - 60px); /* Adjust height to fit below app bar */
                        background: rgba(0, 0, 0, 0.5);
                        z-index: 999;
                        display: none;
                    }
                    .overlay.active { display: block; }

                    /* Desktop Styles */
                    @media (min-width: 768px) {
                        .sidebar {
                            left: 0; /* Always visible on desktop */
                        }
                        .search-container {
                            margin-left: 270px; /* Shift container to the right */
                            margin-right: 20px;
                        }
                        .menu-icon {
                            display: none; /* Hide menu icon on desktop */
                        }
                        .overlay {
                            display: none !important; /* Hide overlay on desktop */
                        }
                    }

                    /* Mobile Styles */
                    @media (max-width: 767px) {
                        .sidebar {
                            left: -250px; /* Hidden by default on mobile */
                        }
                        .sidebar.active {
                            left: 0; /* Visible when toggled */
                        }
                        .search-container {
                            margin: 80px auto 20px; /* Reset margin for mobile */
                        }
                    }

                    /* Animations */
                    @keyframes slideDown {
                        from { opacity: 0; transform: translateY(-10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                </style>
            </head>
            <body>
                <!-- Navbar -->
                <nav class="navbar">
                    <span class="menu-icon" onclick="toggleMenu()"><i class="fas fa-bars"></i></span>
                    <span class="navbar-brand">Gera Jewels</span>
                    <span  class="search-icon" ><a style="text-decoration:none;color:black;"href="/search" ><i class="fas fa-search"></i></a></span>
                    <a href="/cart/get">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.0" stroke="currentColor" class="cart-icon">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  <span class="cart-count" id="cart-count">0</span>
</svg>
       
                        </span>
                    </a>
                </nav>

                <!-- Sidebar -->
                <div id="sidebar-menu" class="sidebar">
                <ul>
      <li><a class="active" href="/dashboard"><i class="fas fa-home"></i>Shop</a></li>
      
      <li><a href="/orders"><i class="fas fa-truck"></i> My Orders</a></li>
      <li><a href="/tac"><i class="fas fa-file-contract"></i> Terms & Conditions</a></li>
      <li><a href="/logout"><i class="fas fa-right-from-bracket"></i>Logout</a></li>
    </ul>
                </div>

                <!-- Overlay -->
                <div id="overlay" class="overlay" onclick="toggleMenu()"></div>

                <!-- Main Content -->
                <div class="search-container">
                    <!-- Search Bar -->
                    <div class="search-bar">
                        <input type="text" id="search-input" placeholder="Search for products..." value="${query}">
                        <span class="search-icon" onclick="submitSearch()"><i class="fas fa-search"></i></span>
                    </div>

                    <!-- Filter Button -->
                    <button class="filter-button" onclick="toggleFilterArea()">
                        <i class="fas fa-filter"></i> Filters
                    </button>

                    <!-- Filter Area -->
                    <div id="filter-area" class="filter-area">
                        <div class="close-filter">
                            <button onclick="toggleFilterArea()"><i class="fas fa-times"></i> Close</button>
                        </div>
                        <form action="/search" method="GET" onsubmit="applyFilters(event)">
                            <input type="hidden" name="query" value="${query}">
                            <div class="row g-2">
                                <div class="col-6">
                                    <div class="filter-section">
                                        <label for="minPrice">Min Price</label>
                                        <input type="number" name="minPrice" id="minPrice" placeholder="Min Price" value="${minPrice}">
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="filter-section">
                                        <label for="maxPrice">Max Price</label>
                                        <input type="number" name="maxPrice" id="maxPrice" placeholder="Max Price" value="${maxPrice}">
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="filter-section">
                                        <label for="condition">Category</label>
                                        <select name="condition" id="condition" class="form-select">
                                            <option value="%">All Categories</option>
                                            <option value="Men" ${condition === 'Men' ? 'selected' : ''}>Men</option>
                                            <option value="Women" ${condition === 'Women' ? 'selected' : ''}>Women</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <button type="submit" class="btn-apply">Apply Filters</button>
                                </div>
                            </div>
                        </form>
                    </div>

                    <!-- Results Heading -->
                    <h4 style="font-family: 'Montserrat', sans-serif;" class="mb-3">${heading}</h4>

                    <!-- Results -->
                    ${productResults.length > 0 ? productHTML : '<p class="text-muted text-center">No results found.</p>'}
                </div>

                <script>
      fetchCartCount()

      // Fetch Cart Count
        async function fetchCartCount() {
            try {
                const res = await fetch('/api/cart/count');
                const data = await res.json();
                const cartCount = document.getElementById('cart-count');
                if (data.count > 0) {
                    cartCount.textContent = data.count;
                    cartCount.classList.add('show');
                } else {
                    cartCount.classList.remove('show');
                }
            } catch (error) {
                console.error('Error fetching cart count:', error);
            }
        }         
                    // Toggle Sidebar
                    function toggleMenu() {
                        const sidebar = document.getElementById('sidebar-menu');
                        const overlay = document.getElementById('overlay');
                        sidebar.classList.toggle('active');
                        overlay.classList.toggle('active');
                    }

                    // Toggle Filter Area
                    function toggleFilterArea() {
                        const filterArea = document.getElementById('filter-area');
                        filterArea.classList.toggle('active');
                    }

                    // Submit Search
                    function submitSearch() {
                        const query = document.getElementById('search-input').value;
                        const condition = document.getElementById('condition').value;
                        const minPrice = document.getElementById('minPrice').value;
                        const maxPrice = document.getElementById('maxPrice').value;
                        window.location.href = \`/search?query=\${encodeURIComponent(query)}&minPrice=\${minPrice}&maxPrice=\${maxPrice}&condition=\${condition}\`;
                    }

                    // Apply Filters
                    function applyFilters(event) {
                        event.preventDefault();
                        const form = event.target;
                        const query = form.querySelector('input[name="query"]').value;
                        const minPrice = form.querySelector('input[name="minPrice"]').value;
                        const maxPrice = form.querySelector('input[name="maxPrice"]').value;
                        const condition = form.querySelector('select[name="condition"]').value;
                        window.location.href = \`/search?query=\${encodeURIComponent(query)}&minPrice=\${minPrice}&maxPrice=\${maxPrice}&condition=\${condition}\`;
                    }

                    // Dynamically Update Search Results as You Type
                    const searchInput = document.getElementById('search-input');
                    if (searchInput) {
                        searchInput.addEventListener('input', function () {
                            const query = this.value;
                            const condition = document.getElementById('condition').value;
                            const minPrice = document.getElementById('minPrice').value;
                            const maxPrice = document.getElementById('maxPrice').value;

                            // Fetch updated results
                            fetch(\`/search?query=\${encodeURIComponent(query)}&minPrice=\${minPrice}&maxPrice=\${maxPrice}&condition=\${condition}\`)
                                .then(response => response.text())
                                .then(html => {
                                    const parser = new DOMParser();
                                    const doc = parser.parseFromString(html, 'text/html');
                                    const newResults = doc.querySelector('.search-container').innerHTML;
                                    document.querySelector('.search-container').innerHTML = newResults;
                                })
                                .catch(error => console.error('Error fetching search results:', error));
                        });
                    }
                </script>
            </body>
            </html>
        `);
    });
});

app.get('/admin', (req, res) => {
 if (!req.isAuthenticated() || req.user.username!="admin8") return res.redirect('/login');

    const userId = req.user.username;

    // Fetch products
    db.query('SELECT * FROM products WHERE seller_user = ?', [userId], (err, products) => {
        if (err) throw err;

        // Fetch orders (joined with products)
        const getOrdersQuery = `
            SELECT orders.*, products.name AS product_name, products.image AS product_image 
            FROM orders 
            JOIN products ON orders.product_id = products.id
            ORDER BY orders.id DESC
        `;
        db.query(getOrdersQuery, (err2, orders) => {
            if (err2) throw err2;

            // Stats
            const totalProducts = products.length;
            const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
            const totalOrders = orders.length;
            let totalSales = 0
            orders.forEach(order => {
                totalSales+=order.price * order.quantity
            });

            // Start HTML
            let html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Seller Dashboard</title>
                <style>
                    body {
      font-family: 'Montserrat', sans-serif;
      margin: 0;
      background: #fff;
      color: #333;
    }
                    .navbar { position: fixed; top: 0; left: 0; width: 100%; z-index: 1001; background: #fff;
                              padding: 12px 20px; display: flex; align-items: center;
                              box-shadow: 0 2px 5px rgba(0,0,0,0.08); font-weight: bold; }
                    .navbar a { text-decoration: none; color: #004d40; display: flex; align-items: center; }
                    .navbar svg { margin-right: 5px; }
                    .container { padding: 90px 20px 20px; max-width: 1200px; margin: auto; }

                    /* Tabs */
                    .tabs { display: flex; border-bottom: 2px solid #ddd; margin-bottom: 20px; }
                    .tab { padding: 12px 20px; cursor: pointer; background: #eee; margin-right: 5px;
                           border-radius: 6px 6px 0 0; font-weight: 500; transition: 0.3s; }
                    .tab.active { background: #004d40; color: white; }
                    .tab-content { display: none; animation: fadeIn 0.4s ease-in; }
                    .tab-content.active { display: block; }
                    @keyframes fadeIn { from {opacity:0;} to {opacity:1;} }

                    /* Stats */
                    .stats-grid { display: flex; gap: 20px; flex-wrap: wrap; }
                    .stat-card { background: white; padding: 20px; border-radius: 10px; flex: 1; min-width: 200px;
                                 box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: center; }
                    .stat-card h3 { margin: 0; font-size: 26px; color: #004d40; }
                    .stat-card p { margin: 5px 0 0; color: #666; }

                    /* Products */
                    .product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
                    .product-card { background: white; border-radius: 12px; overflow: hidden;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: flex; flex-direction: column; }
                    .product-card img { width: 100%; height: 180px; object-fit: cover; }
                    .product-card .info { padding: 15px; flex: 1; }
                    .product-card h3 { margin: 0 0 8px; font-size: 18px; }
                    .product-card p { margin: 4px 0; color: #666; }
                    .product-card .actions { display: flex; gap: 8px; margin-top: 10px; }
                    .product-card button { flex: 1; padding: 8px; border: none; border-radius: 6px; cursor: pointer; }
                    .edit-btn { background: #2196f3; color: white; }
                    .delete-btn { background: #e53935; color: white; }
                    .stock-form input { width: 100%; padding: 6px; margin-top: 6px; border: 1px solid #ccc; border-radius: 6px; }
                    .stock-form button { margin-top: 6px; background: #004d40; color: white; }

                    .add-btn { display: inline-block; background: #4285F4; color: white;
                               padding: 10px 16px; text-decoration: none; border-radius: 6px; margin-top: 15px; }

                    /* Orders */
                    table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; }
                    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
                    th { background: #004d40; color: white; }
                    tr:hover { background: #f9f9f9; }
                    .status { padding: 6px 10px; border-radius: 6px; font-size: 13px; }
                    .pending { background: #fff3cd; color: #856404; }
                    .completed { background: #d4edda; color: #155724; }
                </style>
            </head>
            <body>
                <nav class="navbar">
                    <a href="/dashboard">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" 
                             viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        Back
                    </a>
                </nav>

                <div class="container">
                    <!-- Tabs -->
                    <div class="tabs">
                        <div class="tab active" onclick="showTab('stats')">Statistics</div>
                        <div class="tab" onclick="showTab('products')"> Products</div>
                        <div class="tab" onclick="showTab('orders')"> Orders</div>
                    </div>

                    <!-- Stats -->
                    <div id="stats" class="tab-content active">
                        <h2>Statistics</h2>
                        <div class="stats-grid">
                            <div class="stat-card"><h3>${totalProducts}</h3><p>Total Products</p></div>
                            <div class="stat-card"><h3>${totalStock}</h3><p>Total Stock</p></div>
                            <div class="stat-card"><h3>UGX ${totalSales}</h3><p>Total Sales</p></div>
                            <div class="stat-card"><h3>${totalOrders}</h3><p>Total Orders</p></div>
                        </div>
                    </div>

                    <!-- Products -->
                    <div id="products" class="tab-content">
                        <h2>Your Products</h2>
                        <div class="product-grid">`;

            products.forEach(product => {
                html += `
                <div class="product-card">
                    <img src="${product.image}" alt="Product Image">
                    <div class="info">
                        <h3>${product.name}</h3>
                        <p>UGX ${product.price}</p>
                        <p>Stock: ${product.stock}</p>
                        <div class="actions">
                            <a href="/edit_product/${product.id}"><button class="edit-btn">✏ Edit</button></a>
                            <a href="/delete_product/${product.id}"><button class="delete-btn">🗑 Delete</button></a>
                        </div>
                        <form class="stock-form" action="/update-stock" method="POST">
                            <input type="hidden" name="product_id" value="${product.id}">
                            <input type="number" placeholder="New stock" name="newStock" required>
                            <button type="submit">Update Stock</button>
                        </form>
                    </div>
                </div>`;
            });

            html += `
                        </div>
                        <a href="/add_product" class="add-btn">➕ Add Product</a>
                    </div>

                    <!-- Orders -->
                    <div id="orders" class="tab-content">
                        <h2>Orders</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    
                                    <th>Product</th>
                                    <th>Customer</th>
                                    <th>Quantity</th>
                                    <th>Total</th>
                                    <th>Address</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>`;

            orders.forEach(order => {
                html += `
                <tr>
                    <td>${order.id}</td>
                                       
                    <td>${order.product_name}</td>
                    <td>${order.username || "N/A"}</td>
                    <td>${order.quantity}</td>
                    <td>UGX ${order.price * order.quantity}</td>
                    <td>${order.street}</td>
                    <td><span class="status ${order.order_status}">${order.order_status}</span></td>
                    <td>
                        <form action="/update-order-status" method="POST">
                            <input type="hidden" name="order_id" value="${order.id}">
                            <select name="newStatus" onchange="this.form.submit()">
                                <option value="processing" ${order.order_status === 'processing' ? 'selected' : ''}>Processing</option>
                                <option value="completed" ${order.order_status === 'completed' ? 'selected' : ''}>Completed</option>
                            </select>
                        </form>
                    </td>
                </tr>`;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>

                <script>
                    function showTab(tabId) {
                        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
                        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                        document.querySelector('[onclick="showTab(\\'' + tabId + '\\')"]').classList.add('active');
                        document.getElementById(tabId).classList.add('active');
                    }
                </script>
            </body>
            </html>`;

            res.send(html);
        });
    });
});
// Endpoint to update stock
app.post("/update-stock", (req, res) => {
    const { product_id, newStock } = req.body;
    db.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, product_id], err => {
        if (err) throw err;
        res.redirect('/my-products');
    });
});

// Endpoint to update order status
app.post("/update-order-status", (req, res) => {
    const { order_id, newStatus } = req.body;
    db.query('UPDATE orders SET order_status = ? WHERE id = ?', [newStatus, order_id], err => {
        if (err) throw err;
        res.redirect('/my-products');
    });
});
app.get('/my-productsf', (req, res) => {
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
                    body {
      font-family: 'Montserrat', sans-serif;
      margin: 0;
      background: #fff;
      color: #333;
    }
                    /* Navbar */
        .navbar { 
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 1001; 
            background: #fff; 
            padding: 10px 15px;
            display: flex;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .navbar .menu-icon { 
            cursor: pointer; 
            color: black; 
            font-size: 24px; 
            margin-right: 15px;
        }
        .navbar .cart-icon { 
        width:25px;
        height:25px;
            cursor: pointer; 
            margin-left: auto; 
            color: black; 
            font-size: 24px; 
            position: relative;
        }
        .navbar .cart-count {
            position: absolute;
            top: 5px;
            right: 1px;
            background: #004d40; /* Changed to blue */
            color: white;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 50%;
             /* Hidden by default */
        }
      .navbar .navbar-brand { 
    color: #000; 
    font-size: 22px; 
    font-weight: 500;         /* medium, not too bold */
    font-family: 'Playfair Display', serif; /* elegant serif */
    letter-spacing: 1px;      /* adds spacing for luxury feel */
    text-transform: uppercase; /* gives a premium identity */
}
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
                           <p>STOCK ${product.stock}</p>
                        <a href="/edit_product/${product.id}" class="text-decoration-none"> <button >✏ Edit</button></a>
                       <a href="/delete_product/${product.id}" class="text-decoration-none"> <button>🗑 Delete</button></a>
                       
                       <form action="/update-stock" method="POST">
                            <input type="hidden" name="product_id" value="${product.id}">
                            
                                <label for="comment" class="form-label">Comment</label>
                                <input class="form-control" placeholder="stock value" name="newStock" id="newStock" required></input>
                            </div>
                            <button style="background:#004d40;border:none;outline:none;" type="submit" class="btn btn-primary">Update Stock</button>
                        </form>                       
                       
                       
                       
                       
                       
                       
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
  
  
  // Endpoint to update stock
app.post("/update-stock/", async (req, res) => {
  try {
    
    const { product_id,newStock } = req.body;
  
  
  
  db.query(
        'UPDATE products SET stock = ? WHERE id = ?',
        [newStock, product_id],
        (err, result) => {
            if (err) {
                console.error('Update Product Error:', err);
                return res.status(500).json({ error: 'Error updating product' });
            }
            console.log('Update Result:', result);
            res.redirect("/my-products");
        }
    );
  
  
  
  
  
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to update stock");
  }
});

  
  
  
  
  app.post('/update_productu/:id', upload.single('image'), (req, res) => {
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
            updateProductInDBr(id, name, price, oldImageUrl, description, location, condition, res);
        }
    });
});

// Function to update the product in the database
function updateProductInDBr(id, name, price, image, description, location, condition, res) {
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

app.get('/delete_product/:id', (req, res) => {
      if (!req.isAuthenticated() || req.user.username!="admin8") return res.redirect('/login');
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
                body {
      font-family: 'Montserrat', sans-serif;
      margin: 0;
      background: #fff;
      color: #333;
    }
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
     if (!req.isAuthenticated() || req.user.username!="admin8") return res.redirect('/login');
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

// Add item to cart using URL parameters
app.get('/cart/add/:user_id/:product_id/:quantity', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    const { user_id, product_id, quantity } = req.params;
const { color, size } = req.query;
console.log("color"+color+size)
    // Check if product already exists in cart
    const checkQuery = 'SELECT * FROM cart WHERE username = ? AND product_id = ?';
    db.query(checkQuery, [user_id, product_id], (err, results) => {
        if (err) return res.status(500).send(err);

        if (results.length > 0) {
            // Update quantity if product exists
            const updateQuery = 'UPDATE cart SET quantity = quantity + ? WHERE username = ? AND product_id = ?';
            db.query(updateQuery, [quantity, user_id, product_id], (err) => {
                if (err) return res.status(500).send(err);
                res.redirect('/product/'+product_id);
            });
        } else {
            // Add new product to cart
            const insertQuery = 'INSERT INTO cart (username, product_id, quantity, colour, size ) VALUES (?, ?, ?, ?, ?)';
            db.query(insertQuery, [user_id, product_id, quantity, color, size, ], (err) => {
                if (err) return res.status(500).send(err);
                res.redirect('/product/'+product_id);
            });
        }
    });
});
app.get('/cart/get', (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    const user_id = req.user.username;

    const checkQuery = 'SELECT * FROM cart WHERE username = ?';
    db.query(checkQuery, [user_id], (err, cartResults) => {
        if (err) return res.status(500).send(err);

        if (cartResults.length === 0) {
            return res.send(`
                <html>
                    <head>
                        <title>Shopping Cart - Nexora</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
                      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet"> 
                        <style>
                            body {
      font-family: 'Montserrat', sans-serif;
      margin: 0;
      background: #fff;
      color: #333;
    }
      /* Navbar */
        .navbar { 
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 1001; 
            background: #fff; 
            padding: 10px 15px;
            display: flex;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .navbar .menu-icon { 
            cursor: pointer; 
            color: black; 
            font-size: 24px; 
            margin-right: 15px;
        }
        .navbar .cart-icon { 
        width:25px;
        height:25px;
            cursor: pointer; 
            margin-left: auto; 
            color: black; 
            font-size: 24px; 
            position: relative;
        }
        .navbar .cart-count {
            position: absolute;
            top: 5px;
            right: 1px;
            background: #004d40; /* Changed to blue */
            color: white;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 50%;
             /* Hidden by default */
        }
      .navbar .navbar-brand { 
    color: #000; 
    font-size: 22px; 
    font-weight: 500;         /* medium, not too bold */
    font-family: 'Playfair Display', serif; /* elegant serif */
    letter-spacing: 1px;      /* adds spacing for luxury feel */
    text-transform: uppercase; /* gives a premium identity */
}
                            .container { padding: 20px; max-width: 800px; margin: auto; }
                            .empty-cart { text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
                            .empty-cart h3 { font-size: 24px; margin-bottom: 10px; }
                            .empty-cart p { font-size: 16px; color: #666; }
                         
                        </style>
                    </head>
                    <body>
                        <!-- Navbar -->
                        <nav class="navbar">
                            <span class="menu-icon" onclick="toggleMenu()"><i class="fas fa-bars"></i></span>
                            <span class="navbar-brand">Gera Jewels</span>
                            <span  class="search-icon" ><a style="text-decoration:none;color:black;"href="/search" ><i class="fas fa-search"></i></a></span>
                            <a href="/cart/get">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.0" stroke="currentColor" class="cart-icon">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  <span class="cart-count" id="cart-count">0</span>
</svg>
       
                            </a>
                        </nav>

                        <!-- Sidebar -->
                        <div id="sidebar-menu" class="sidebar">
                       <ul>
      <li><a class="active" href="/dashboard"><i class="fas fa-home"></i>Shop</a></li>
      
      <li><a href="/orders"><i class="fas fa-truck"></i> My Orders</a></li>
      <li><a href="/tac"><i class="fas fa-file-contract"></i> Terms & Conditions</a></li>
      <li><a href="/logout"><i class="fas fa-right-from-bracket"></i>Logout</a></li>
    </ul>
                        </div>

                        <!-- Overlay -->
                        <div id="overlay" class="overlay" onclick="toggleMenu()"></div>

                        <!-- Main Content -->
                        <div class="container">
                            <div class="empty-cart">
                                <h3>Your cart is empty!</h3>
                                <p>Start shopping to add items to your cart.</p>
                            </div>
                        </div>

                        <script>
                            // Toggle Sidebar
                            function toggleMenu() {
                                const sidebar = document.getElementById('sidebar-menu');
                                const overlay = document.getElementById('overlay');
                                sidebar.classList.toggle('active');
                                overlay.classList.toggle('active');
                            }
                        </script>
                    </body>
                </html>
            `);
        }

        const productIds = cartResults.map(item => item.product_id);
        const productQuery = `SELECT * FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`;

        db.query(productQuery, productIds, (err, productResults) => {
            if (err) return res.status(500).send(err);

            let total = 0;
            let cartItemsHTML = productResults.map(product => {
                const cartItem = cartResults.find(item => item.product_id === product.id);
                const totalItemPrice = cartItem.quantity * product.price;
                total += totalItemPrice;

                return `
                    <div class="cart-item">
                        <img src="${product.image}" alt="${product.name}">
                        <div class="details">
                            <h3>${product.name}</h3>
                            <p>UGX ${product.price}</p>
                            <div class="quantity">
                                <button class="quantity-btn minus" onclick="updateQuantity(${product.id}, -1)">−</button>
                                <span id="qty-${product.id}">${cartItem.quantity}</span>
                                <button class="quantity-btn plus" onclick="updateQuantity(${product.id}, 1)">+</button>
                            </div>
                        </div>
                        <button class="delete-btn" onclick="deleteItem(${product.id})"><i class="fas fa-times"></i></button>
                    </div>
                `;
            }).join('');

            res.send(`
                <html>
                    <head>
                        <title>Shopping Cart - Gera Jewels</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
                        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
                        <style>
                            body {
      font-family: 'Montserrat', sans-serif;
      margin: 0;
      background: #fff;
      color: #333;
    }
                            /* Navbar */
        .navbar { 
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 1001; 
            background: #fff; 
            padding: 10px 15px;
            display: flex;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .navbar .menu-icon { 
            cursor: pointer; 
            color: black; 
            font-size: 24px; 
            margin-right: 15px;
        }
        .navbar .cart-icon { 
        width:25px;
        height:25px;
            cursor: pointer; 
            margin-left: auto; 
            color: black; 
            font-size: 24px; 
            position: relative;
        }
        .navbar .cart-count {
            position: absolute;
            top: 5px;
            right: 1px;
            background: #004d40; /* Changed to blue */
            color: white;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 50%;
             /* Hidden by default */
        }
      .navbar .navbar-brand { 
    color: #000; 
    font-size: 22px; 
    font-weight: 500;         /* medium, not too bold */
    font-family: 'Playfair Display', serif; /* elegant serif */
    letter-spacing: 1px;      /* adds spacing for luxury feel */
    text-transform: uppercase; /* gives a premium identity */
}
                            .container { padding: 20px; max-width: 800px; margin: auto;margin-top:40px; }
                            .cart-item { display: flex; align-items: center; background: white; padding: 15px; margin-bottom: 2px;margin-top:10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
                            .cart-item img { width: 70px; height: 70px; border-radius: 5px; margin-right: 12px; object-fit: cover; }
                            .cart-item .details { flex-grow: 1; }
                            .cart-item h3 {font-family: 'Montserrat', sans-serif; margin: 0; font-size: 18px; }
                            .cart-item p { font-family: 'Montserrat', sans-serif;margin: 5px 0; color: #666; font-size: 16px; }
                            .quantity { font-family: 'Montserrat', sans-serif;display: flex; align-items: center; margin-top: 5px;border:1px solid #212121; }
                            .quantity-btn { background: #fff; color: #212121; border: none; padding: 6px 12px; cursor: pointer; font-size: 16px; border-radius: 5px; margin: 0 5px; transition: background-color 0.2s; }
                            .quantity-btn:hover { background: #fff; }
                            .quantity span { margin: 0 10px; font-size: 16px; }
                            .delete-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #ff4444; }
                            .delete-btn:hover { color: #cc0000; }
                            .address-section { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); margin-top: 15px; }
                            .address-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-weight: bold;font-family: 'Montserrat', sans-serif; }
                            .address-header span { font-size: 18px; font-family: 'Montserrat', sans-serif;}
                            .address-form { display: none; margin-top: 10px; }
                            .address-form label { display: block; margin-top: 8px; font-size: 14px;font-family: 'Montserrat', sans-serif; }
                            .address-form input, .address-form select { width: 100%; padding: 10px; margin-top: 5px; border-radius: 5px; border: 1px solid #ccc; font-size: 16px;font-family: 'Montserrat', sans-serif; }
                            .total-section { font-weight: bold; font-size: 20px; display: flex; justify-content: space-between; margin-top: 20px;font-family: 'Montserrat', sans-serif; }
                            .checkout-btn { background:  #004d40; color: white; width: 100%; padding: 12px; font-size: 20px; border: none; cursor: pointer; border-radius: 5px; }
                            .checkout-btn:hover { background: #004d40; }

                            /* Sidebar */
                            .sidebar {
                                position: fixed;
                                top: 0;
                                left: -250px;
                                width: 250px;
                                height: 100%;
                                background: #fff;
                                box-shadow: 2px 0px 5px rgba(0, 0, 0, 0.2);
                                transition: 0.3s;
                                z-index: 1000;
                                padding-top: 60px;
                            }
                            .sidebar.active { left: 0; }
                            .sidebar ul { list-style: none; padding: 0; margin: 0; }
                            .sidebar ul li { padding: 15px 20px; border-bottom: 1px solid #ddd; }
                            .sidebar ul li a { text-decoration: none; color: #333; display: flex; align-items: center; }
                            .sidebar ul li a i { margin-right: 10px; }

                            /* Overlay */
                            .overlay {
                                position: fixed;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                background: rgba(0, 0, 0, 0.5);
                                z-index: 999;
                                display: none;
                            }
                            .overlay.active { display: block; }
                        </style>
                        <script>
                        
                   fetchCartCount()
    // Fetch Cart Count
        async function fetchCartCount() {
            try {
                const res = await fetch('/api/cart/count');
                const data = await res.json();
                const cartCount = document.getElementById('cart-count');
                if (data.count > 0) {
                    cartCount.textContent = data.count;
                    cartCount.classList.add('show');
                } else {
                    cartCount.classList.remove('show');
                }
            } catch (error) {
                console.error('Error fetching cart count:', error);
            }
        }    
                        
                        
                            // Toggle Sidebar
                            function toggleMenu() {
                                const sidebar = document.getElementById('sidebar-menu');
                                const overlay = document.getElementById('overlay');
                                sidebar.classList.toggle('active');
                                overlay.classList.toggle('active');
                            }

                            // Toggle Address Form
                            function toggleAddress() {
                                const addressForm = document.getElementById('address-form');
                                addressForm.style.display = addressForm.style.display === 'block' ? 'none' : 'block';
                            }

                            async function updateQuantity(productId, change) {
                                const qtyElement = document.getElementById('qty-' + productId);
                                const newQty = parseInt(qtyElement.innerText) + change;

                               if (newQty < 1) {
                                    deleteItem(productId)
  } // Prevent quantity from going below 1
else{

                                const response = await fetch('/cart/update', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ productId, change })
                                });

                                if (response.ok) {
                                    qtyElement.innerText = newQty;
                                    updateTotal();
                                }
                                }
                            }

                            async function deleteItem(productId) {
                                const response = await fetch('/cart/delete', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ productId })
                                });

                                if (response.ok) {
                                    location.reload(); // Reload after deletion
                                }
                            }

                            function updateTotal() {
                                let total = 0;
                                document.querySelectorAll('.cart-item').forEach(item => {
                                    const price = parseFloat(item.querySelector('p').innerText.replace('UGX ', ''));
                                    const quantity = parseInt(item.querySelector('.quantity span').innerText);
                                    total += price * quantity;
                                });
                                document.getElementById('total').innerText = 'UGX ' + total.toFixed(2);
                            }

                            function proceedToCheckout() {
                                // Get address values from the form
                                const country = document.getElementById('country').value;
                                const city = document.getElementById('city').value;
                                const street = document.getElementById('street').value;

                                // Get the total price
                                const total = document.getElementById('total').innerText.replace('UGX ', '');

                                // Redirect to the checkout page with address and total as query parameters
                                window.location.href = '/checkout/' + total + '?country=' + encodeURIComponent(country) + '&city=' + encodeURIComponent(city) + '&street=' + encodeURIComponent(street);
                            }
                        </script>
                    </head>
                    <body>
                        <!-- Navbar -->
                        <nav class="navbar">
                            <span class="menu-icon" onclick="toggleMenu()"><i class="fas fa-bars"></i></span>
                            <span class="navbar-brand">Gera Jewels</span>
                            <span  class="search-icon" ><a style="text-decoration:none;color:black;"href="/search" ><i class="fas fa-search"></i></a></span>
                            <a href="/cart/get">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.0" stroke="currentColor" class="cart-icon">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  <span class="cart-count" id="cart-count">0</span>
</svg>
       
                            </a>
                        </nav>

                        <!-- Sidebar -->
                        <div id="sidebar-menu" class="sidebar">
                       <ul>
      <li><a class="active" href="/dashboard"><i class="fas fa-home"></i>Shop</a></li>
      
      <li><a href="/orders"><i class="fas fa-truck"></i> My Orders</a></li>
      <li><a href="/tac"><i class="fas fa-file-contract"></i> Terms & Conditions</a></li>
      <li><a href="/logout"><i class="fas fa-right-from-bracket"></i>Logout</a></li>
    </ul>
                        </div>

                        <!-- Overlay -->
                        <div id="overlay" class="overlay" onclick="toggleMenu()"></div>

                        <!-- Main Content -->
                        <div class="container">
                            ${cartItemsHTML}
                            <div class="address-section">
                                <div class="address-header" onclick="toggleAddress()">
                                    <span>Enter Address</span>
                                    <span>&#9662;</span>
                                </div>
                                <div id="address-form" class="address-form">
                                    <label>Country:</label>
                                    <select id="country">
                                        <option>Uganda</option>
                                        <option>Kenya</option>
                                        <option>Tanzania</option>
                                        <option>Rwanda</option>
                                    </select>
                                    <label>City:</label>
                                    <input type="text" id="city">
                                    <label>Street Name:</label>
                                    <input type="text" id="street">
                                </div>
                            </div>
                            <div class="total-section">
                                <span>Total:</span>
                                <span id="total">UGX ${total.toFixed(2)}</span>
                            </div>
                            <button class="checkout-btn" onclick="proceedToCheckout()">Checkout</button>
                        </div>
                    </body>
                </html>
            `);
        });
    });
});


app.get('/checkout/:amount', (req, res) => {
    const total = req.params.amount;
    const username = req.user.username; // Ensure the user is logged in
if (!req.isAuthenticated()) {
        return res.redirect('/login');
    }
    // Fetch cart items for the user
    const cartQuery = 'SELECT * FROM cart WHERE username = ?';
    db.query(cartQuery, [username], (err, cartResults) => {
        if (err) return res.status(500).send(err);

        // Fetch product details for items in the cart
        const productIds = cartResults.map(item => item.product_id);
        const productQuery = `SELECT * FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`;
        db.query(productQuery, productIds, (err, productResults) => {
            if (err) return res.status(500).send(err);

            // Map cart items with product details
            const cartItemsHTML = productResults.map(product => {
                const cartItem = cartResults.find(item => item.product_id === product.id);
                return `
                    <div class="cart-item">
                        <img src="${product.image}" alt="${product.name}">
                        <div class="details">
                            <h3>${product.name}</h3>
                            <p>UGX ${product.price}</p>
                            <p>Quantity: ${cartItem.quantity}</p>
                        </div>
                    </div>
                `;
            }).join('');

            res.send(`
                <html>
                    <head>
                        <title>Checkout - Nexora</title>
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
                        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
                        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
                        <script src="https://www.paypal.com/sdk/js?client-id=AQsypE15OrmhMTKoz19wU7QPrRdTEOdOOf-TLEAdw-yom4dvxxnGa0dHqQG2ou9crgdkJDagYwPHbvMH"></script>
                        <style>
                            body {
      font-family: 'Montserrat', sans-serif;
      margin: 0;
      background: #fff;
      color: #333;
    }
                         /* Navbar */
        .navbar { 
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 1001; 
            background: #fff; 
            padding: 10px 15px;
            display: flex;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .navbar .menu-icon { 
            cursor: pointer; 
            color: black; 
            font-size: 24px; 
            margin-right: 15px;
        }
        .navbar .cart-icon { 
        width:25px;
        height:25px;
            cursor: pointer; 
            margin-left: auto; 
            color: black; 
            font-size: 24px; 
            position: relative;
        }
        .navbar .cart-count {
            position: absolute;
            top: 5px;
            right: 1px;
            background: #004d40; /* Changed to blue */
            color: white;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 50%;
             /* Hidden by default */
        }
      .navbar .navbar-brand { 
    color: #000; 
    font-size: 22px; 
    font-weight: 500;         /* medium, not too bold */
    font-family: 'Playfair Display', serif; /* elegant serif */
    letter-spacing: 1px;      /* adds spacing for luxury feel */
    text-transform: uppercase; /* gives a premium identity */
}
                            .container { padding: 20px; max-width: 800px; margin: 80px auto 20px; background: white; border-radius: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); }
                            h2 { font-family: 'Montserrat', sans-serif;text-align: center; }
                            #paypal-button-container { margin-top: 20px; text-align: center; }
                            .cart-item { display: flex; align-items: center; margin-bottom: 15px; padding: 10px; border-bottom: 1px solid #ddd; }
                            .cart-item img { width: 80px; height: 80px; border-radius: 5px; margin-right: 15px; object-fit: cover; }
                            .cart-item .details { flex-grow: 1; }
                            .cart-item h3 { margin: 0; font-size: 18px;font-family: 'Montserrat', sans-serif; }
                            .cart-item p { margin: 5px 0; color: #666; font-size: 16px;font-family: 'Montserrat', sans-serif; }
                            .total-section { font-weight: bold; font-size: 20px; text-align: center; margin: 20px 0; font-family: 'Montserrat', sans-serif;}
    /* Sidebar for Mobile */
                            .sidebar {
                                position: fixed;
                                top: 60px; /* Below the navbar */
                                left: -250px;
                                width: 250px;
                                height: calc(100% - 60px);
                                background: #fff;
                                box-shadow: 2px 0px 5px rgba(0, 0, 0, 0.2);
                                transition: 0.3s;
                                z-index: 1000;
                                padding-top: 20px;
                            }
                            .sidebar.active { left: 0; }
                            .sidebar ul { list-style: none; padding: 0; margin: 0; }
                            .sidebar ul li { padding: 15px 20px; border-bottom: 1px solid #ddd; }
                            .sidebar ul li a { text-decoration: none; color: #333; display: flex; align-items: center; }
                            .sidebar ul li a i { margin-right: 10px; }

                            /* Overlay */
                            .overlay {
                                position: fixed;
                                top: 60px; /* Below the navbar */
                                left: 0;
                                width: 100%;
                                height: calc(100% - 60px);
                                background: rgba(0, 0, 0, 0.5);
                                z-index: 999;
                                display: none;
                            }
                            .overlay.active { display: block; }

                            /* Desktop Layout */
                            @media (min-width: 768px) {
                                .sidebar {
                                    position: fixed;
                                    top: 0;
                                    left: 0;
                                    width: 250px;
                                    height: 100%;
                                    box-shadow: none;
                                    z-index: 1;
                                }
                                .navbar {
                                    margin-left: 250px; /* Push navbar to the right */
                                    width: calc(100% - 250px);
                                }
                                .container {
                                    margin-left: 250px; /* Push content to the right */
                                    width: calc(100% - 250px);
                                }
                                .menu-icon { display: none; } /* Hide menu icon on desktop */
                                .overlay { display: none !important; } /* Hide overlay on desktop */
                            }
                        </style>
                    </head>
                    <body>
                        <!-- Navbar -->
                        <nav class="navbar">
                            <span class="menu-icon" onclick="toggleMenu()"><i class="fas fa-bars"></i></span>
                            <span class="navbar-brand">Gera Jewels</span>
                            <span  class="search-icon" ><a style="text-decoration:none;color:black;"href="/search" ><i class="fas fa-search"></i></a></span>
                            <a href="/cart/get">
                                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.0" stroke="currentColor" class="cart-icon">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  <span class="cart-count" id="cart-count">0</span>
</svg>
       
                            </a>
                        </nav>

                        <!-- Sidebar -->
                        <div id="sidebar-menu" class="sidebar">
                        <ul>
      <li><a class="active" href="/dashboard"><i class="fas fa-home"></i>Shop</a></li>
      
      <li><a href="/orders"><i class="fas fa-truck"></i> My Orders</a></li>
      <li><a href="/tac"><i class="fas fa-file-contract"></i> Terms & Conditions</a></li>
      <li><a href="/logout"><i class="fas fa-right-from-bracket"></i>Logout</a></li>
    </ul>
                        </div>

                        <!-- Overlay -->
                        <div id="overlay" class="overlay" onclick="toggleMenu()"></div>

                        <!-- Main Content -->
                        <div class="container">
                            <h2>Confirm Payment</h2>
                            <div class="cart-items">
                                ${cartItemsHTML}
                            </div>
                            <div class="total-section">
                                <p>Total: UGX <strong>${total}</strong></p>
                            </div>
                            <div id="paypal-button-container"></div>
                        </div>

                        <script>
                        
                       fetchCartCount()

      // Fetch Cart Count
        async function fetchCartCount() {
            try {
                const res = await fetch('/api/cart/count');
                const data = await res.json();
                const cartCount = document.getElementById('cart-count');
                if (data.count > 0) {
                    cartCount.textContent = data.count;
                    cartCount.classList.add('show');
                } else {
                    cartCount.classList.remove('show');
                }
            } catch (error) {
                console.error('Error fetching cart count:', error);
            }
        }
                        
                        
                            // Toggle Sidebar
                            function toggleMenu() {
                                const sidebar = document.getElementById('sidebar-menu');
                                const overlay = document.getElementById('overlay');
                                sidebar.classList.toggle('active');
                                overlay.classList.toggle('active');
                            }

                            // PayPal Integration
                            document.addEventListener("DOMContentLoaded", function () {
                
                                paypal.Buttons({
                                    createOrder: (data, actions) => {
                                        return actions.order.create({
                                            purchase_units: [{
                                                amount: { value: ${JSON.stringify(Math.round(total/3500),2)} }
                                            }]
                                        });
                                    },
                                    onApprove: (data, actions) => {
                                        return actions.order.capture().then(() => {
                                            fetch('/process-order', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ username: ${JSON.stringify(username)}, total: ${JSON.stringify(Math.round(total/3500),2)} })
                                            })
                                            .then(response => response.text())
                                            .then(data => {
                                                window.location.href = '/orders';
                                            })
                                            .catch(error => console.log("Fetch Error:", error));
                                        });
                                    }
                                }).render('#paypal-button-container');
                            });
                        </script>
                    </body>
                </html>
            `);
        });
    });
});
app.post('/process-order', async (req, res) => {
    try {
        const username = req.user.username; // Ensure req.user exists

        // Fetch user's phone number from users table
        const getUserQuery = 'SELECT user_contact FROM users WHERE username = ?';
        const [userResults] = await db.promise().query(getUserQuery, [username]);

        if (userResults.length === 0) {
            return res.status(400).send("User not found");
        }

        const userPhone = userResults[0].user_contact; // store phone number

        // Fetch cart items
        const getCartQuery = 'SELECT * FROM cart WHERE username = ?';
        const [cartResults] = await db.promise().query(getCartQuery, [username]);

        if (cartResults.length === 0) {
            return res.redirect('/orders');
        }

        // Insert orders for each cart item
        const insertOrderQuery = `
            INSERT INTO orders 
            (username, country, city, street, product_id, price, payment_status, order_status, quantity, colour, size)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const orderPromises = cartResults.map(async (item) => {
            // Fetch product details
            const getProductQuery = 'SELECT * FROM products WHERE id = ?';
            const [productResults] = await db.promise().query(getProductQuery, [item.product_id]);

            if (productResults.length > 0) {
                const product = productResults[0];

                await db.promise().query(insertOrderQuery, [
                    username,
                    'Uganda',            // country
                    'Default City',      // city
                    userPhone,           // store phone number in street slot
                    product.id,
                    product.price,
                    'Paid',
                    'Payment received,Processing order',
                    item.quantity,
                    item.colour,
                    item.size
                ]);
            }
        });

        await Promise.all(orderPromises);

        // Clear cart
        const clearCartQuery = 'DELETE FROM cart WHERE username = ?';
        await db.promise().query(clearCartQuery, [username]);

        res.redirect('/orders');
    } catch (err) {
        console.error("Error processing order:", err);
        res.status(500).send("Error processing order");
    }
});

app.get('/orders', (req, res) => {
      if (!req.isAuthenticated()) return res.redirect('/login');
    const username = req.user.username;

    const getOrdersQuery = `
        SELECT orders.*, products.name, products.image 
        FROM orders 
        JOIN products ON orders.product_id = products.id 
        WHERE orders.username = ? 
        ORDER BY orders.id DESC
    `;
    db.query(getOrdersQuery, [username], (err, orders) => {
        if (err) return res.status(500).send("Error fetching orders");

        let ordersHTML = orders.map(order => `
            <div class="order-item">
                <img src="${order.image}" alt="${order.name}">
                <div class="details">
                    <h3>${order.name}</h3>
                    <p>Quantity: ${order.quantity}</p>
                    <p>Total: UGX ${order.price * order.quantity}</p>
                    <p>Colour: ${order.colour}</p>
                    <p>Size: ${order.size}</p>
                    <p>Status: <strong>${order.order_status}</strong></p>
                </div>
            </div>
        `).join('');

        res.send(`
            <html>
                <head>
                    <title>My Orders - Nexora</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
                    <style>
                        body {
      font-family: 'Montserrat', sans-serif;
      margin: 0;
      background: #fff;
      color: #333;
    }
                       /* Navbar */
        .navbar { 
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 1001; 
            background: #fff; 
            padding: 10px 15px;
            display: flex;
            align-items: center;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }
        .navbar .menu-icon { 
            cursor: pointer; 
            color: black; 
            font-size: 24px; 
            margin-right: 15px;
        }
        .navbar .cart-icon { 
        width:25px;
        height:25px;
            cursor: pointer; 
            margin-left: auto; 
            color: black; 
            font-size: 24px; 
            position: relative;
        }
        .navbar .cart-count {
            position: absolute;
            top: 5px;
            right: 1px;
            background: #004d40; /* Changed to blue */
            color: white;
            font-size: 12px;
            padding: 2px 6px;
            border-radius: 50%;
             /* Hidden by default */
        }
      .navbar .navbar-brand { 
    color: #000; 
    font-size: 22px; 
    font-weight: 500;         /* medium, not too bold */
    font-family: 'Playfair Display', serif; /* elegant serif */
    letter-spacing: 1px;      /* adds spacing for luxury feel */
    text-transform: uppercase; /* gives a premium identity */
}
                        .container { padding: 20px; max-width: 800px; margin: 80px auto 20px; background: white; border-radius: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1); }
                        h2 { text-align: center; }
                        .order-item { display: flex; align-items: center; margin-bottom: 15px; padding: 10px; border-bottom: 1px solid #ddd; }
                        .order-item img { width: 80px; height: 80px; border-radius: 5px; margin-right: 15px; object-fit: cover; }
                        .order-item .details { flex-grow: 1; }
                        .order-item h3 { margin: 0; font-size: 18px; }
                        .order-item p { margin: 5px 0; color: #666; font-size: 16px; }

                        /* Sidebar */
                        .sidebar {
                            position: fixed;
                            top: 60px; /* Below the app bar */
                            left: -250px;
                            width: 250px;
                            height: calc(100% - 60px); /* Adjust height to fit below app bar */
                            background: #fff;
                            box-shadow: 2px 0px 5px rgba(0, 0, 0, 0.2);
                            transition: 0.3s;
                            z-index: 1000;
                            padding-top: 20px;
                        }
                        .sidebar.active { left: 0; }
                        .sidebar ul { list-style: none; padding: 0; margin: 0; }
                        .sidebar ul li { padding: 15px 20px; border-bottom: 1px solid #ddd; }
                        .sidebar ul li a { text-decoration: none; color: #333; display: flex; align-items: center; }
                        .sidebar ul li a i { margin-right: 10px; }

                        /* Overlay */
                        .overlay {
                            position: fixed;
                            top: 60px; /* Below the app bar */
                            left: 0;
                            width: 100%;
                            height: calc(100% - 60px); /* Adjust height to fit below app bar */
                            background: rgba(0, 0, 0, 0.5);
                            z-index: 999;
                            display: none;
                        }
                        .overlay.active { display: block; }

                        /* Desktop Styles */
                        @media (min-width: 768px) {
                            .sidebar {
                                left: 0; /* Always visible on desktop */
                            }
                            .container {
                                margin-left: 270px; /* Shift container to the right */
                                margin-right: 20px;
                            }
                            .menu-icon {
                                display: none; /* Hide menu icon on desktop */
                            }
                            .overlay {
                                display: none !important; /* Hide overlay on desktop */
                            }
                        }

                        /* Mobile Styles */
                        @media (max-width: 767px) {
                            .sidebar {
                                left: -250px; /* Hidden by default on mobile */
                            }
                            .sidebar.active {
                                left: 0; /* Visible when toggled */
                            }
                            .container {
                                margin: 80px auto 20px; /* Reset margin for mobile */
                            }
                        }
                    </style>
                </head>
                <body>
                    <!-- Navbar -->
                    <nav class="navbar">
                        <span class="menu-icon" onclick="toggleMenu()"><i class="fas fa-bars"></i></span>
                        <span class="navbar-brand">Gera Jewels</span>
                        <span  class="search-icon" ><a style="text-decoration:none;color:black;"href="/search" ><i class="fas fa-search"></i></a></span>
                        <a href="/cart/get">
                               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.0" stroke="currentColor" class="cart-icon">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
  <span class="cart-count" id="cart-count">0</span>
</svg>
       
                        </a>
                    </nav>

                    <!-- Sidebar -->
                    <div id="sidebar-menu" class="sidebar">
                        <ul>
      <li><a class="active" href="/dashboard"><i class="fas fa-home"></i>Shop</a></li>
      
      <li><a href="/orders"><i class="fas fa-truck"></i> My Orders</a></li>
      <li><a href="/tac"><i class="fas fa-file-contract"></i> Terms & Conditions</a></li>
      <li><a href="/logout"><i class="fas fa-right-from-bracket"></i>Logout</a></li>
    </ul>
                    </div>

                    <!-- Overlay -->
                    <div id="overlay" class="overlay" onclick="toggleMenu()"></div>

                    <!-- Main Content -->
                    <div class="container">
                        <h2>Your Orders</h2>
                        ${ordersHTML}
                    </div>

                    <script>
                        // Toggle Sidebar
                        function toggleMenu() {
                            const sidebar = document.getElementById('sidebar-menu');
                            const overlay = document.getElementById('overlay');
                            sidebar.classList.toggle('active');
                            overlay.classList.toggle('active');
                        }
                    </script>
                </body>
            </html>
        `);
    });
});
// Update cart item quantity
app.post('/cart/update', (req, res) => {
    const { productId, change } = req.body;
    const user_id = req.user.username;

    const updateQuery = 'UPDATE cart SET quantity = quantity + ? WHERE username = ? AND product_id = ?';
    db.query(updateQuery, [change, user_id, productId], (err) => {
        if (err) return res.status(500).send(err);
        res.send({ success: true });
    });
});

// Delete cart item
app.post('/cart/delete', (req, res) => {
    const { productId } = req.body;
    const user_id = req.user.username;

    const deleteQuery = 'DELETE FROM cart WHERE username = ? AND product_id = ?';
    db.query(deleteQuery, [user_id, productId], (err) => {
        if (err) return res.status(500).send(err);
        res.send({ success: true });
    });
});
// Middleware to ensure the user is logged in
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login'); // Redirect to login if not authenticated
};


app.post('/add-review', ensureAuthenticated, (req, res) => {
    const { product_id, rating, comment } = req.body;
    const user_id = req.user.username; // Assuming the user ID is stored in req.user

    // Validate input
    if (!product_id || !rating || !comment) {
        return res.status(400).send("All fields are required.");
    }

    // Check if the user has already reviewed this product
    const checkSql = 'SELECT * FROM reviews WHERE product_id = ? AND user_id = ?';
    db.query(checkSql, [product_id, user_id], (err, results) => {
        if (err) {
            console.error('Error checking review:', err);
            return res.status(500).send("Error processing request.");
        }

        if (results.length > 0) {
            // Update the existing review
            const updateSql = 'UPDATE reviews SET rating = ?, comment = ? WHERE product_id = ? AND user_id = ?';
            db.query(updateSql, [rating, comment, product_id, user_id], (err, updateResult) => {
                if (err) {
                    console.error('Error updating review:', err);
                    return res.status(500).send("Error updating review.");
                }
                res.redirect(`/product/${product_id}`);
            });
        } else {
            // Insert a new review
            const insertSql = 'INSERT INTO reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)';
            db.query(insertSql, [product_id, user_id, rating, comment], (err, insertResult) => {
                if (err) {
                    console.error('Error inserting review:', err);
                    return res.status(500).send("Error submitting review.");
                }
                res.redirect(`/product/${product_id}`);
            });
        }
    });
});



app.post('/update_product/:id', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
    { name: 'image3', maxCount: 1 },
    { name: 'image4', maxCount: 1 }
]), async (req, res) => {
    const id = req.params.id;
    const { name, price, description, sizes, colours } = req.body;

    // Fetch existing product details
    db.query('SELECT * FROM products WHERE id = ?', [id], async (err, results) => {
        if (err) {
            console.error('Error fetching product:', err);
            return res.status(500).json({ error: 'Error fetching product details' });
        }
        
        if (results.length === 0) return res.send("Product not found");

        let product = results[0];

        let updatedImages = {
            image: product.image,
            image2: product.image2,
            image3: product.image3,
            image4: product.image4
        };

        try {
            // Process each named image field and update if a new image is uploaded
            for (let key of ['image', 'image2', 'image3', 'image4']) {
                if (req.files[key]) {
                    let file = req.files[key][0];

                    console.log(`Uploading ${key}:`, file.path); // Debugging line

                    // Upload new image to Cloudinary
                    let cloudResult = await cloudinary.uploader.upload(file.path);

                    console.log(`Uploaded ${key}:`, cloudResult.secure_url); // Debugging line

                    // Delete old image from Cloudinary if it exists
                    if (updatedImages[key] && updatedImages[key].includes("cloudinary")) {
                        let publicId = updatedImages[key].split('/').pop().split('.')[0];
                        await cloudinary.uploader.destroy(publicId);
                    }

                    // Update image URL in object
                    updatedImages[key] = cloudResult.secure_url;
                }
            }

            // Update DB with new image URLs
            updateProductInDB(id, name, price, updatedImages, description, sizes, colours, res);

        } catch (error) {
            console.error("Cloudinary upload error:", error); // Logs the exact error
            return res.status(500).json({ error: `Cloudinary upload error: ${error.message}` });
        }
    });
});
function updateProductInDB(id, name, price, images, description, sizes, colours, res) {
    // Ensure correct format (convert arrays to comma-separated strings)
    if (Array.isArray(sizes)) {
        sizes = sizes.join(',');
    }
    if (Array.isArray(colours)) {
        colours = colours.join(',');
    }

    console.log({ id, name, price, images, description, sizes, colours });

    const query = `
        UPDATE products 
        SET name = ?, price = ?, image = ?, image2 = ?, image3 = ?, image4 = ?, description = ?, sizes = ?, colours = ? 
        WHERE id = ?`;

    const values = [
        name, price, images.image, images.image2, images.image3, images.image4,
        description, sizes || null, colours || null, id
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Update Product Error:', err);
            return res.status(500).json({ error: err.message });
        }
        console.log('Update Result:', result);
        res.redirect("/my-products");
    });
}
app.get('/edit_product/:id', (req, res) => {
      if (!req.isAuthenticated() || req.user.username!="admin8") return res.redirect('/login');
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
                body {
      font-family: 'Montserrat', sans-serif;
      margin: 0;
      background: #fff;
      color: #333;
    }
                .container { max-width: 600px; margin: auto; }
                .product-img { width: 100%; height: 300px; object-fit: cover; border-radius: 8px; }
                .back-btn { display: block; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container mt-4">
                <a href="/admin" class="btn btn-secondary back-btn">← Back to Dashboard</a>
             <form action="/update_product/${product.id}" method="post" enctype="multipart/form-data">
                <div class="mb-3">
                    <label>Product Name</label>
                    <input type="text" value="${product.name}" class="form-control" name="name" placeholder="Enter product name" required>
                </div>
                <div style="display:none;" class="mb-3">
                    <label>product sizes</label>
                    <input  type="text" value="${product.sizes}" class="form-control" name="sizes" placeholder="Enter sizes(separate with commas)" >
                </div>
               <div class="mb-3">
                    <label>product colours</label>
                    <input type="text" value="${product.colours}" class="form-control" name="colours" placeholder="Enter colours(separate with commas)" required>
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
                 <div class="mb-3">
                    <label>Product Image2</label>
                    <input type="file" class="form-control" name="image2" required>
                
                 </div>
                 <div class="mb-3">
                    <label>Product Image3</label>
                    <input type="file" class="form-control" name="image3" required>
                
                 </div>
                 <div class="mb-3">
                    <label>Product Image4</label>
                    <input type="file" class="form-control" name="image4" required>
                
                 </div>
                 <button type="submit" class="btn btn-success w-100">Update Product </button>
            </form>
        </body>
        </html>`;

        res.send(productDetailsHTML);
    });
});


// Server Start
app.listen(3000, () => console.log('Server running on port 3000'));
