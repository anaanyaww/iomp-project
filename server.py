from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from math import radians, sin, cos, sqrt, atan2
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Apply CORS with max permissiveness for development
CORS(app, resources={r"/*": {"origins": "*"}})

# Enhanced mock data for various areas in Hyderabad
MOCK_RESOURCES_BY_AREA = {
    "default": [
        {
            'id': '1',
            'name': 'Autism Support Center',
            'address': '123 Main St, Hyderabad',
            'rating': 4.8,
            'phone': '+91 9876543210',
            'distance': '2.3 km',
            'hours': 'Monday-Friday: 9:00 AM - 5:00 PM',
            'website': 'https://example.com',
            'services': ['Autism specialist', 'Developmental assessment'],
            'verified': True
        },
        {
            'id': '2',
            'name': 'Dyslexia Learning Center',
            'address': '456 Oak Ave, Hyderabad',
            'rating': 4.5,
            'phone': '+91 8765432109',
            'distance': '3.1 km',
            'hours': 'Monday-Saturday: 8:00 AM - 6:00 PM',
            'website': 'https://example.com',
            'services': ['Dyslexia tutor', 'Educational Support'],
            'verified': True
        },
        {
            'id': '3',
            'name': 'Spectrum Therapies',
            'address': '789 Pine Rd, Hyderabad',
            'rating': 4.2,
            'phone': '+91 7654321098',
            'distance': '4.5 km',
            'hours': 'Monday-Friday: 8:00 AM - 7:00 PM',
            'website': 'https://example.com',
            'services': ['Speech therapy', 'Occupational therapy'],
            'verified': False
        }
    ],
    
    "malakpet": [
        {
            'id': 'm1',
            'name': 'Malakpet Autism Research Center',
            'address': '123 Azamabad Rd, Malakpet, Hyderabad',
            'rating': 4.7,
            'phone': '+91 9876543001',
            'distance': '1.2 km',
            'hours': 'Monday-Friday: 9:00 AM - 6:00 PM',
            'website': 'https://example.com',
            'services': ['Autism specialist', 'Developmental assessment', 'Early intervention'],
            'verified': True
        },
        {
            'id': 'm2',
            'name': 'Dyslexia Support Hub - Malakpet',
            'address': '34 Saidabad Colony, Malakpet, Hyderabad',
            'rating': 4.4,
            'phone': '+91 8765432002',
            'distance': '2.3 km',
            'hours': 'Monday-Saturday: 10:00 AM - 7:00 PM',
            'website': 'https://example.com',
            'services': ['Dyslexia tutor', 'Reading specialist', 'Educational Support'],
            'verified': True
        },
        {
            'id': 'm3',
            'name': 'Nizam Neurodevelopment Institute',
            'address': '78 Railway Station Rd, Malakpet, Hyderabad',
            'rating': 4.9,
            'phone': '+91 7654321003',
            'distance': '1.7 km',
            'hours': 'Monday-Saturday: 8:00 AM - 8:00 PM',
            'website': 'https://example.com',
            'services': ['Autism therapy', 'Learning disability assessment', 'Behavioral intervention'],
            'verified': True
        }
    ],
    
    "hitech city": [
        {
            'id': 'h1',
            'name': 'Tech Minds Neurodiversity Center',
            'address': 'Cyber Towers, HITEC City, Hyderabad',
            'rating': 4.9,
            'phone': '+91 9876543004',
            'distance': '0.7 km',
            'hours': 'Monday-Friday: 8:00 AM - 8:00 PM',
            'website': 'https://example.com',
            'services': ['Autism assessment', 'ADHD evaluation', 'Executive function coaching'],
            'verified': True
        },
        {
            'id': 'h2',
            'name': 'Hitech City Learning Hub',
            'address': 'Mindspace IT Park, HITEC City, Hyderabad',
            'rating': 4.6,
            'phone': '+91 8765432005',
            'distance': '1.5 km',
            'hours': 'Monday-Saturday: 9:00 AM - 6:00 PM',
            'website': 'https://example.com',
            'services': ['Dyslexia remediation', 'Educational Support', 'Assistive technology training'],
            'verified': True
        },
        {
            'id': 'h3',
            'name': 'Sensory Integration Therapy Center',
            'address': 'Raheja Mindspace, HITEC City, Hyderabad',
            'rating': 4.8,
            'phone': '+91 7654321006',
            'distance': '2.1 km',
            'hours': 'Monday-Friday: 10:00 AM - 7:00 PM',
            'website': 'https://example.com',
            'services': ['Sensory processing therapy', 'Occupational therapy', 'Speech therapy'],
            'verified': False
        }
    ],
    
    "madhapur": [
        {
            'id': 'md1',
            'name': 'Madhapur Autism Excellence Center',
            'address': 'Ayyappa Society, Madhapur, Hyderabad',
            'rating': 4.8,
            'phone': '+91 9876543007',
            'distance': '1.3 km',
            'hours': 'Monday-Saturday: 8:30 AM - 6:30 PM',
            'website': 'https://example.com',
            'services': ['ABA therapy', 'Social skills training', 'Parent coaching'],
            'verified': True
        },
        {
            'id': 'md2',
            'name': 'Dyscalculia & Dyslexia Support - Madhapur',
            'address': 'Jubilee Enclave, Madhapur, Hyderabad',
            'rating': 4.5,
            'phone': '+91 8765432008',
            'distance': '2.0 km',
            'hours': 'Monday-Friday: 9:00 AM - 7:00 PM',
            'website': 'https://example.com',
            'services': ['Math intervention', 'Dyslexia remediation', 'Educational assessments'],
            'verified': True
        },
        {
            'id': 'md3',
            'name': 'Neurodiversity Parent Support Group',
            'address': 'Inorbit Mall Rd, Madhapur, Hyderabad',
            'rating': 4.7,
            'phone': '+91 7654321009',
            'distance': '1.9 km',
            'hours': 'Saturday: 10:00 AM - 12:00 PM',
            'website': 'https://example.com',
            'services': ['Parent support group', 'Resource sharing', 'Community building'],
            'verified': False
        }
    ],
    
    "jubilee hills": [
        {
            'id': 'j1',
            'name': 'Jubilee Hills Pediatric Neurodevelopment Center',
            'address': 'Road No. 10, Jubilee Hills, Hyderabad',
            'rating': 4.9,
            'phone': '+91 9876543010',
            'distance': '1.0 km',
            'hours': 'Monday-Saturday: 9:00 AM - 5:00 PM',
            'website': 'https://example.com',
            'services': ['Developmental pediatrics', 'Autism assessment', 'Early intervention'],
            'verified': True
        },
        {
            'id': 'j2',
            'name': 'Elite Learning Support Center',
            'address': 'Road No. 36, Jubilee Hills, Hyderabad',
            'rating': 4.7,
            'phone': '+91 8765432011',
            'distance': '2.5 km',
            'hours': 'Monday-Friday: 10:00 AM - 6:00 PM',
            'website': 'https://example.com',
            'services': ['Executive function coaching', 'Dyslexia support', 'Academic intervention'],
            'verified': True
        },
        {
            'id': 'j3',
            'name': 'Jubilee Speech & Language Clinic',
            'address': 'Film Nagar, Jubilee Hills, Hyderabad',
            'rating': 4.8,
            'phone': '+91 7654321012',
            'distance': '3.1 km',
            'hours': 'Monday-Saturday: 8:00 AM - 8:00 PM',
            'website': 'https://example.com',
            'services': ['Speech therapy', 'Language intervention', 'Social communication'],
            'verified': True
        }
    ],
    
    "banjara hills": [
        {
            'id': 'b1',
            'name': 'Banjara Hills Neuropsychology Center',
            'address': 'Road No. 12, Banjara Hills, Hyderabad',
            'rating': 4.9,
            'phone': '+91 9876543013',
            'distance': '1.8 km',
            'hours': 'Monday-Friday: 9:00 AM - 6:00 PM',
            'website': 'https://example.com',
            'services': ['Neuropsychological assessment', 'Autism diagnosis', 'Learning disability evaluation'],
            'verified': True
        },
        {
            'id': 'b2',
            'name': 'Premier Dyslexia Institute',
            'address': 'Road No. 3, Banjara Hills, Hyderabad',
            'rating': 4.8,
            'phone': '+91 8765432014',
            'distance': '2.2 km',
            'hours': 'Monday-Saturday: 8:00 AM - 7:00 PM',
            'website': 'https://example.com',
            'services': ['Orton-Gillingham approach', 'Reading intervention', 'Educational therapy'],
            'verified': True
        },
        {
            'id': 'b3',
            'name': 'Banjara Hills Sensory Gym',
            'address': 'Road No. 14, Banjara Hills, Hyderabad',
            'rating': 4.7,
            'phone': '+91 7654321015',
            'distance': '3.0 km',
            'hours': 'Monday-Sunday: 9:00 AM - 8:00 PM',
            'website': 'https://example.com',
            'services': ['Sensory integration', 'Motor skills development', 'Play-based therapy'],
            'verified': False
        }
    ]
}

@app.route('/api/search-resources', methods=['OPTIONS', 'POST'])
def search_resources():
    # Explicitly handle OPTIONS requests
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        return response

    try:
        data = request.get_json()
        location = data.get('location', '').lower()
        resource_type = data.get('resourceType', 'all')
        
        # Select appropriate mock data based on location
        if location in MOCK_RESOURCES_BY_AREA:
            resources = MOCK_RESOURCES_BY_AREA[location]
        elif 'malakpet' in location:
            resources = MOCK_RESOURCES_BY_AREA['malakpet']
        elif 'hitech' in location or 'hi-tech' in location or 'hi tech' in location:
            resources = MOCK_RESOURCES_BY_AREA['hitech city']
        elif 'madhapur' in location:
            resources = MOCK_RESOURCES_BY_AREA['madhapur']
        elif 'jubilee' in location:
            resources = MOCK_RESOURCES_BY_AREA['jubilee hills']
        elif 'banjara' in location:
            resources = MOCK_RESOURCES_BY_AREA['banjara hills']
        else:
            resources = MOCK_RESOURCES_BY_AREA['default']
        
        # Filter by resource type if needed
        if resource_type != 'all':
            filtered_resources = filter_by_type(resources, resource_type)
            return jsonify({'results': filtered_resources})
        
        return jsonify({'results': resources})
        
    except Exception as e:
        app.logger.error(f"Error in search_resources: {str(e)}")
        return jsonify({'error': str(e), 'results': MOCK_RESOURCES_BY_AREA['default']}), 200

def filter_by_type(resources, resource_type):
    # Map resource types to keywords to check in services
    type_keywords = {
        'healthcare': ['specialist', 'psychiatrist', 'psychologist', 'pediatrician', 'assessment', 'diagnosis', 'evaluation'],
        'education': ['tutor', 'education', 'learning', 'academic', 'reading', 'remediation'],
        'community': ['support group', 'community', 'parent', 'resource sharing'],
        'therapy': ['therapy', 'intervention', 'coaching', 'ABA', 'sensory', 'speech', 'occupational']
    }
    
    keywords = type_keywords.get(resource_type, [])
    filtered_results = []
    
    for resource in resources:
        for service in resource['services']:
            if any(keyword.lower() in service.lower() for keyword in keywords):
                filtered_results.append(resource)
                break
    
    return filtered_results

if __name__ == '__main__':
    # Make sure we specify host='0.0.0.0' to allow external connections
    app.run(debug=True, host='0.0.0.0', port=5001)