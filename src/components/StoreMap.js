import { GoogleMap, Marker, DirectionsRenderer, useLoadScript } from "@react-google-maps/api";
import { useState, useEffect } from "react";
import axios from "axios";
import { fetchAuthSession } from '@aws-amplify/auth';
import './StoreMap.css';

const mapContainerStyle = {
    width: "100%",
    height: "500px",
};

const apiUrl = process.env.REACT_APP_BACKEND_URL;
const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

export default function StoreMap({ searchQuery }) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: googleMapsApiKey
    });

    const [center, setCenter] = useState({ lat: 40.7128, lng: -74.0060 });
    const [stores, setStores] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [directions, setDirections] = useState(null);
    const [selectedStore, setSelectedStore] = useState(null);
    const [distances, setDistances] = useState({});

    useEffect(() => {
        const fetchStores = async () => {
            const [idToken, accessToken] = await getAccessToken();
            const response = await axios.get(`${apiUrl}/items/search?product=${searchQuery}`, {
                headers: {
                    'Authorization': idToken,
                    'Content-Type': 'application/json',
                    'x-amz-security-token': accessToken
                }
            });
            setStores(response.data.stores);
        };
        if (searchQuery) fetchStores();
    }, [searchQuery]);

    useEffect(() => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                setCenter(location);
                setUserLocation(location);
            },
            (error) => console.error("Error fetching location", error)
        );
    }, []);

    // Calculate distances
    useEffect(() => {
        if (userLocation && stores.length > 0 && window.google) {
            const service = new window.google.maps.DistanceMatrixService();
            const destinations = stores.map(store => ({ lat: store.latitude, lng: store.longitude }));

            service.getDistanceMatrix(
                {
                    origins: [userLocation],
                    destinations: destinations,
                    travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (response, status) => {
                    if (status === "OK") {
                        const results = response.rows[0].elements;
                        const distanceMap = {};
                        results.forEach((res, index) => {
                            if (res.status === "OK") {
                                distanceMap[stores[index].id] = {
                                    distance: res.distance.text,
                                    duration: res.duration.text,
                                };
                            }
                        });
                        setDistances(distanceMap);
                    } else {
                        console.error("DistanceMatrix failed:", status);
                    }
                }
            );
        }
    }, [userLocation, stores]);

    const getDirectionsToStore = (store) => {
        if (!userLocation || !store) return;

        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
            {
                origin: userLocation,
                destination: { lat: store.latitude, lng: store.longitude },
                travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
                if (status === 'OK') {
                    setDirections(result);
                    setSelectedStore(store);
                } else {
                    console.error("Error fetching directions", status);
                }
            }
        );
    };

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

    if (loadError) return <div>Error loading maps</div>;
    if (!isLoaded) return <div>Loading Maps...</div>;

    return (
        <div className="map-container">
            <div className="sidebar">
                <h3>Stores</h3>
                <ul className="store-list">
                    {stores.map((store) => {
                        const isSelected = selectedStore?.id === store.id;
                        const distanceData = distances[store.id];

                        const googleMapsUrl = userLocation
                            ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${store.latitude},${store.longitude}&travelmode=driving`
                            : null;

                        return (
                            <li key={store.id} className={isSelected ? "selected" : ""}>
                                <div onClick={() => getDirectionsToStore(store)} className="store-info">
                                    <strong>{store.name}</strong><br />
                                    <strong>{searchQuery}</strong>
                                    <br />
                                    <strong>Price : Rs.{store.price}</strong>
                                    {store.address}<br />
                                    {distanceData ? (
                                        <span className="distance-info">
                                            {distanceData.distance} • {distanceData.duration}
                                        </span>
                                    ) : (
                                        <span className="distance-info">Loading distance...</span>
                                    )}
                                </div>
                                {googleMapsUrl && (
                                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="navigate-button">
                                        Navigate
                                    </a>
                                )}
                            </li>
                        );
                    })}
                </ul>

            </div>

            <div className="map-view">
                <GoogleMap mapContainerStyle={mapContainerStyle} zoom={12} center={userLocation || center}>
                    {userLocation && <Marker position={userLocation} title="Your Location" />}
                    {stores.map((store) => (
                        <Marker
                            key={store.id}
                            position={{ lat: store.latitude, lng: store.longitude }}
                            title={store.name}
                        />
                    ))}
                    {directions && <DirectionsRenderer directions={directions} />}
                </GoogleMap>
            </div>
        </div>
    );
}
