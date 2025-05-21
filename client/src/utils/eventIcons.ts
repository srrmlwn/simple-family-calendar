import { 
    // Sports & Activities
    Target, // For sports and competitions
    Gamepad2, // For games and gaming
    Activity, // For running and athletics
    Circle, // For sports
    Timer, // For practice and training
    
    // Meetings & Communication
    Video, // For video calls
    Phone, // For phone calls
    MessageSquare, // For meetings and messages
    Users, // For group meetings
    Headphones, // For calls and audio
    
    // Medical & Health
    Heart, // For health checkups
    Shield, // For health and safety
    Stethoscope, // For medical appointments
    
    // Celebrations & Social
    Gift, // For gifts and presents
    Star, // For celebrations
    Music, // For concerts and music events
    
    // Food & Dining
    Utensils, // For dining and restaurants
    Coffee, // For coffee meetings
    Wine, // For dinner and drinks
    Cookie, // For casual dining
    
    // Shopping & Retail
    ShoppingCart, // For shopping
    CreditCard, // For purchases
    Package, // For shopping bags
    
    // Travel & Transportation
    Plane, // For flights
    Train, // For train travel
    Car, // For car travel
    Bus, // For bus travel
    
    // Education & Learning
    Book, // For studying
    GraduationCap, // For graduation
    Library, // For library visits
    Calculator, // For math and science
    
    // Work & Business
    Briefcase, // For work
    Building2, // For office
    FileText, // For documents
    Mail, // For work emails
    
    // Fitness & Exercise
    Bike, // For cycling
    Mountain, // For hiking
    
    // Default
    Calendar,
    Beer, // Default icon
} from 'lucide-react';

// Define the icon mapping with keywords
const iconMappings: { [key: string]: any } = {
    // Sports & Activities
    'soccer': Target,
    'football': Target,
    'basketball': Target,
    'tennis': Target,
    'swimming': Activity,
    'running': Activity,
    'game': Gamepad2,
    'gaming': Gamepad2,
    'sport': Target,
    'practice': Timer,
    'match': Target,
    'tournament': Target,
    'competition': Target,
    'volleyball': Target,
    'sports': Target,
    'training': Timer,
    'workout': Activity,
    
    // Meetings & Communication
    'meeting': Users,
    'call': Headphones,
    'phone': Phone,
    'video': Video,
    'zoom': Video,
    'conference': Users,
    'chat': MessageSquare,
    'message': MessageSquare,
    'discussion': MessageSquare,
    'audio': Headphones,
    'webinar': Video,
    
    // Medical & Health
    'doctor': Stethoscope,
    'appointment': Stethoscope,
    'medical': Stethoscope,
    'checkup': Heart,
    'health': Heart,
    'medicine': Shield,
    'emergency': Shield,
    'hospital': Stethoscope,
    'clinic': Stethoscope,
    'pharmacy': Shield,
    'dentist': Stethoscope,
    
    // Celebrations & Social
    'birthday': Gift,
    'party': Star,
    'celebration': Star,
    'concert': Music,
    'event': Star,
    'gift': Gift,
    'present': Gift,
    'anniversary': Star,
    'wedding': Star,
    'graduation': GraduationCap,
    'festival': Music,
    
    // Food & Dining
    'dinner': Utensils,
    'lunch': Utensils,
    'breakfast': Utensils,
    'restaurant': Utensils,
    'coffee': Coffee,
    'drinks': Wine,
    'beer': Beer,
    'wine': Wine,
    'cocktail': Wine,
    'bar': Wine,
    'pub': Wine,
    'snack': Cookie,
    'food': Utensils,
    'cafe': Coffee,
    'brunch': Utensils,
    
    // Shopping & Retail
    'shopping': ShoppingCart,
    'store': ShoppingCart,
    'mall': ShoppingCart,
    'purchase': CreditCard,
    'buy': ShoppingCart,
    'retail': ShoppingCart,
    'package': Package,
    'delivery': Package,
    'market': ShoppingCart,
    'groceries': ShoppingCart,
    
    // Travel & Transportation
    'travel': Plane,
    'trip': Plane,
    'flight': Plane,
    'airport': Plane,
    'train': Train,
    'car': Car,
    'bus': Bus,
    'vacation': Plane,
    'journey': Plane,
    'commute': Car,
    'transit': Bus,
    
    // Education & Learning
    'school': GraduationCap,
    'class': Book,
    'study': Book,
    'exam': Calculator,
    'library': Library,
    'learning': Book,
    'course': Book,
    'lecture': Book,
    'seminar': Book,
    'workshop': Book,
    'tutorial': Book,
    
    // Work & Business
    'work': Briefcase,
    'office': Building2,
    'interview': Briefcase,
    'business': Building2,
    'document': FileText,
    'email': Mail,
    'deadline': FileText,
    'project': Briefcase,
    'client': Users,
    
    // Fitness & Exercise
    'gym': Activity,
    'exercise': Activity,
    'fitness': Activity,
    'yoga': Activity,
    'cycling': Bike,
    'hiking': Mountain,
    'run': Activity,
    'swim': Activity
};

export const getEventIcon = (title: string) => {
    const lowercaseTitle = title.toLowerCase();
    
    // Check for keyword matches
    for (const [keyword, icon] of Object.entries(iconMappings)) {
        if (lowercaseTitle.includes(keyword)) {
            return icon;
        }
    }
    
    // Return default calendar icon if no match found
    return Calendar;
}; 