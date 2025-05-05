import React, {useEffect, useState} from 'react';
import { Link } from 'react-router';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from '@aws-amplify/auth';
import axios from 'axios';

const apiUrl = process.env.REACT_APP_BACKEND_URL;

function NavBar() {
    const { signOut } = useAuthenticator((context) => [context.signOut]);
    // get the current user and check if store is already registered by calling the API
    const [isStoreRegistered, setIsStoreRegistered] = useState(true);

    async function getAccessToken() {
        try {
            const session = await fetchAuthSession();
            const idToken = session.tokens?.idToken?.toString(); // Get the ID Token
            const accessToken = session.tokens?.accessToken?.toString();
            console.log("id token : ", idToken);
            console.log("access token : ", accessToken);
            const availableTokens = session.userSub;
            console.log('available tokens are ', availableTokens)
            return [idToken, accessToken];
        } catch (error) {
            console.error("Error getting access token:", error);
            return null;
        }
    }

    useEffect(() => {
        async function fetchStoreRegistrationStatus() {
            try {
                // Get store registration status from the API
                const response = await axios.get(`${apiUrl}/items/store/`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `${(await getAccessToken())[0]}`,
                        'Content-Type': 'application/json',
                        'x-amz-security-token': (await getAccessToken())[1]
                    }
                });
                if (response.data.Items.length === 0) {
                    setIsStoreRegistered(false);
                }
            } catch (error) {
                alert("Error getting data please reload:");
                console.error("Error getting data please reload:", error);
            }
        }
        fetchStoreRegistrationStatus();
    }, []);

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <button className="navbar-burger">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
                <Link className="navbar-item" to={"/"}>
                    Shop Locator
                </Link>
            </div>
            <div className={`navbar-menu`}>
                <div className="navbar-end">
                    {!isStoreRegistered ? <Link to={"register-store"} className="navbar-item">
                        Register Store
                    </Link> :
                    <Link className="navbar-item" to={"store-inventory"}>
                        Your Store Inventory
                    </Link>}
                    <button className="navbar-item button is-danger" onClick={signOut}>
                        Sign Out
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default NavBar;