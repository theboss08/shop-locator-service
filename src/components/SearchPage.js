import { useState, useEffect } from "react";
import StoreMap from "./StoreMap";
import NavBar from "./NavBar";
import './SearchPage.css';
import { fetchAuthSession } from '@aws-amplify/auth';
import axios from "axios";

const apiUrl = process.env.REACT_APP_BACKEND_URL;

export default function SearchPage() {
    const [inputValue, setInputValue] = useState("");
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [debouncedInput, setDebouncedInput] = useState("");

    const [userLocation, setUserLocation] = useState(null);
    const [locationGranted, setLocationGranted] = useState(false);

    async function getAccessToken() {
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken?.toString();
            const accessToken = session.tokens?.accessToken?.toString();
            return [idToken, accessToken];
        } catch (error) {
            console.error("Error getting access token:", error);
            return [null, null];
        }
    }

    // Debounce input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedInput(inputValue);
        }, 300);
        return () => clearTimeout(handler);
    }, [inputValue]);

    // Fetch suggestions
    useEffect(() => {
        const fetchSuggestions = async (debouncedInput) => {
            if (!debouncedInput) {
                setSuggestions([]);
                return;
            }

            const [idToken, accessToken] = await getAccessToken();

            axios.get(`${apiUrl}/items/search?suggest=${debouncedInput}`, {
                headers: {
                    'Authorization': idToken,
                    'Content-Type': 'application/json',
                    'x-amz-security-token': accessToken
                }
            })
                .then((res) => setSuggestions(res.data.suggestions))
                .catch((err) => {
                    console.error("Failed to fetch suggestions", err);
                    setSuggestions([]);
                });
        };
        fetchSuggestions(debouncedInput);
    }, [debouncedInput]);

    const handleSelect = (productName) => {
        setInputValue(productName);
        setQuery(productName);
        setSuggestions([]);
    };

    // Request location access on mount
    useEffect(() => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setLocationGranted(true);
            },
            (error) => {
                console.warn("Location access denied:", error);
                setLocationGranted(false);
            }
        );
    }, []);

    return (
        <>
            <NavBar />
            {!locationGranted ? (
                <div className="overlay">
                    <div className="overlay-content">
                        <h2>Location Required</h2>
                        <p>This website needs your location to function. Please allow location access in your browser.</p>
                    </div>
                </div>
            ) : (
                <div className="search-container">
                    <input
                        type="text"
                        className="search-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Search for a product..."
                        autoComplete="off"
                    />
                    {suggestions.length > 0 && (
                        <ul className="suggestions-list">
                            {suggestions.map((item, index) => (
                                <li key={index} onClick={() => handleSelect(item.name)}>
                                    <div className="suggestion-name">{item.name}</div>
                                    <div className="suggestion-description">{item.description}</div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <StoreMap searchQuery={query} userLocation={userLocation} />
                </div>
            )}
        </>
    );
}
