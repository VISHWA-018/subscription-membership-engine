/**
 * Authentication Controller
 * 
 * Handles user registration, login, logout, and profile retrieval.
 * Uses bcrypt for password hashing and JWT for session tokens.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const UserModel = require('../models/userModel');
const SubscriptionModel = require('../models/subscriptionModel');

const AuthController = {
    /**
     * POST /api/auth/register
     * Register a new user account
     * 
     * Flow:
     * 1. Validate input fields
     * 2. Check if email already exists
     * 3. Hash the password with bcrypt
     * 4. Create user record in database
     * 5. Return success message (user must log in separately)
     */
    register: async (req, res) => {
        try {
            // Validate input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { name, email, password } = req.body;

            // Check if user already exists
            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    error: { message: 'Email already registered. Please log in.' }
                });
            }

            // Hash password using bcrypt
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Create user in database
            const result = await UserModel.create(name, email, hashedPassword);

            res.status(201).json({
                success: true,
                message: 'Registration successful. Please log in.',
                data: {
                    userId: result.insertId,
                    name,
                    email
                }
            });
        } catch (error) {
            console.error('Registration Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Registration failed. Please try again.' }
            });
        }
    },

    /**
     * POST /api/auth/login
     * Authenticate user and return JWT token
     * 
     * Flow:
     * 1. Validate input
     * 2. Find user by email
     * 3. Compare password with bcrypt
     * 4. Check subscription expiry (lazy expiry on login)
     * 5. Generate JWT with user ID, email, role
     * 6. Return token and user data
     */
    login: async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { email, password } = req.body;

            // Find user by email
            const user = await UserModel.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Invalid email or password.' }
                });
            }

            // Compare provided password with hashed password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Invalid email or password.' }
                });
            }

            // EXPIRY CHECK ON LOGIN:
            // Check if user has an active subscription that has expired
            // This implements the "lazy expiry" pattern on login
            const subscription = await SubscriptionModel.findActiveByUserId(user.id);
            if (subscription) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const endDate = new Date(subscription.end_date);
                endDate.setHours(0, 0, 0, 0);

                if (today > endDate) {
                    await SubscriptionModel.updateStatus(subscription.id, 'expired');
                }
            }

            // Generate JWT token
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            // Get fresh subscription status after potential expiry update
            const currentSubscription = await SubscriptionModel.findActiveByUserId(user.id);

            res.status(200).json({
                success: true,
                message: 'Login successful.',
                data: {
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    },
                    subscription: currentSubscription || null
                }
            });
        } catch (error) {
            console.error('Login Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Login failed. Please try again.' }
            });
        }
    },

    /**
     * GET /api/auth/profile
     * Get authenticated user's profile and subscription info
     * Requires: authMiddleware
     */
    getProfile: async (req, res) => {
        try {
            const user = await UserModel.findById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'User not found.' }
                });
            }

            // Get active subscription info
            const subscription = await SubscriptionModel.findActiveByUserId(req.user.id);

            // Get subscription history
            const subscriptionHistory = await SubscriptionModel.findAllByUserId(req.user.id);

            res.status(200).json({
                success: true,
                data: {
                    user,
                    activeSubscription: subscription || null,
                    subscriptionHistory
                }
            });
        } catch (error) {
            console.error('Profile Error:', error.message);
            res.status(500).json({
                success: false,
                error: { message: 'Error fetching profile.' }
            });
        }
    }
};

module.exports = AuthController;
