import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import config from './index';

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
            callbackURL: (() => {
                const url = `${process.env.API_URL || 'http://localhost:4000'}/api/auth/google/callback`;
                console.log('Google OAuth callback URL configured as:', url);
                console.log('Environment variables:', {
                    API_URL: process.env.API_URL,
                    NODE_ENV: process.env.NODE_ENV
                });
                return url;
            })(),
            scope: ['profile', 'email', 'openid']
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const userRepository = AppDataSource.getRepository(User);
                
                // Check if user already exists
                let user = await userRepository.findOne({
                    where: { email: profile.emails?.[0].value }
                });

                if (!user) {
                    // Create new user if doesn't exist
                    user = new User();
                    user.email = profile.emails?.[0].value || '';
                    user.firstName = profile.name?.givenName || '';
                    user.lastName = profile.name?.familyName || '';
                    // For Google users, we'll set a random password since they'll use Google to login
                    user.passwordHash = 'google-oauth-' + Math.random().toString(36).slice(-8);
                    
                    user = await userRepository.save(user);
                }

                return done(null, user);
            } catch (error) {
                return done(error as Error);
            }
        }
    )
);

// Serialize user for the session
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done) => {
    try {
        const userRepository = AppDataSource.getRepository(User);
        const user = await userRepository.findOne({ where: { id } });
        done(null, user);
    } catch (error) {
        done(error);
    }
});

export default passport; 