import { fetchAuthSession } from 'aws-amplify/auth';
import React, { useState } from 'react';

const apiUrl = process.env.REACT_APP_BACKEND_URL;

const StoreRegistration = () => {
    const [name, setName] = useState('');
    const [location, setLocation] = useState({ latitude: null, longitude: null });
    const [error, setError] = useState('');

    const handleLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                    setError('');
                },
                (err) => {
                    setError('Unable to fetch location. Please allow location access.');
                }
            );
        } else {
            setError('Geolocation is not supported by your browser.');
        }
    };

    async function getAccessToken() {
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken?.toString(); // Get the ID Token
            const accessToken = session.tokens?.accessToken?.toString();
            console.log("id token : ", idToken);
            console.log("access token : ", accessToken);
            return [idToken, accessToken];
        } catch (error) {
            console.error("Error getting access token:", error);
            return null;
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !location.latitude || !location.longitude) {
            setError('Please fill all fields and fetch location.');
            return;
        }

        const payload = {
            'name': name,
            'latitude': location.latitude,
            'longitude': location.longitude,
        };

        try {
            const response = await fetch(`${apiUrl}/items/store`, {
                method: 'PUT',
                headers: {
                    'Authorization': `${(await getAccessToken())[0]}`,
                    'Content-Type': 'application/json',
                    'x-amz-security-token': (await getAccessToken())[1]
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                alert('Store registered successfully!');
                setName('');
                setLocation({ latitude: null, longitude: null });
                setError('');
            } else {
                alert('Failed to register store. Please try again.');
                setError('Failed to register store. Please try again.');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        }
    };

    return (
        <div className="store-registration-container">
            <h2 className="form-title">Store Registration</h2>
            <form className="store-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="name" className="form-label">Store Name:</label>
                    <input
                        type="text"
                        id="name"
                        className="form-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>
                <div className="form-group location-group">
                    <button type="button" className="btn location-btn" onClick={handleLocation}>
                        Get Current Location
                    </button>
                    {location.latitude && location.longitude && (
                        <p className="location-display">
                            Location: {location.latitude}, {location.longitude}
                        </p>
                    )}
                </div>
                {error && <p className="error-message">{error}</p>}
                <div className="form-group submit-group">
                    <button type="submit" className="btn submit-btn">Register Store</button>
                </div>
            </form>
        </div>

    );
};

export default StoreRegistration;