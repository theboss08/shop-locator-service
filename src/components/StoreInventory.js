import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from '@aws-amplify/auth';
import './Inventory.css';
import NavBar from './NavBar';

const ITEMS_PER_PAGE = 5;

const apiUrl = process.env.REACT_APP_BACKEND_URL;

const StoreInventory = () => {
    const [inventory, setInventory] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        description: '',
        price: '',
        quantity: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [editIndex, setEditIndex] = useState(null); // Tracks which item is being edited
    const [editData, setEditData] = useState({}); // Holds data for editing


    // Filter inventory by name, category, or description
    const filteredInventory = inventory.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
    const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE);

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

    // Fetch inventory data
    useEffect(() => {
        const fetchInventory = async () => {
            const [accessToken, securityToken] = await getAccessToken();
            let allItems = [];
            let lastEvaluatedKey = null;

            try {
                do {
                    const response = await axios.get(`${apiUrl}/items`, {
                        params: lastEvaluatedKey ? { lastEvaluatedKey: JSON.stringify(lastEvaluatedKey) } : {},
                        headers: {
                            'Authorization': accessToken,
                            'Content-Type': 'application/json',
                            'x-amz-security-token': securityToken
                        }
                    });

                    const { Items, LastEvaluatedKey } = response.data;
                    allItems = [...allItems, ...Items];
                    lastEvaluatedKey = LastEvaluatedKey;

                } while (lastEvaluatedKey);

                setInventory(allItems);
            } catch (error) {
                console.error('Error fetching inventory:', error);
            }
        };

        fetchInventory();
    }, []);

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = await fetch(`${apiUrl}/items`, {
            method: 'PUT',
            headers: {
                'Authorization': `${(await getAccessToken())[0]}`,
                'Content-Type': 'application/json',
                'x-amz-security-token': (await getAccessToken())[1]
            },
            body: JSON.stringify(formData),
        })
        if (response.ok) {
            alert('Item added successfully!');
            setInventory([...inventory, formData]);
            setFormData({
                name: '',
                category: '',
                description: '',
                price: '',
                quantity: '',
            });
        } else {
            alert('Failed to add item. Please try again.');
        }

    };

    const startEdit = (index) => {
        setEditIndex(index);
        for (let item of inventory) {
            if (item.id === index) {
                setEditData({ ...item });
                break;
            }
        }
    };
    
    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };
    
    const cancelEdit = () => {
        setEditIndex(null);
        setEditData({});
    };
    
    const saveEdit = async (index) => {
        try {
            const [accessToken, securityToken] = await getAccessToken();
            const response = await axios.post(`${apiUrl}/items/${index}`, editData, {
                method: 'POST',
                headers: {
                    'Authorization': accessToken,
                    'Content-Type': 'application/json',
                    'x-amz-security-token': securityToken
                }
            });
    
            if (response.status === 200) {
                console.log('edit data', editData);
                let updatedInventory = [...inventory];
                updatedInventory = inventory.map(item =>
                    item.id === editData.id ? editData : item
                );
                setInventory(updatedInventory);
                cancelEdit();
            } else {
                alert('Failed to update item.');
            }
        } catch (error) {
            console.error('Error updating item:', error);
        }
    };
    
    const deleteItem = async (item) => {
        if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    
        try {
            const [accessToken, securityToken] = await getAccessToken();
            const response = await axios.delete(`${apiUrl}/items/${item.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': accessToken,
                    'Content-Type': 'application/json',
                    'x-amz-security-token': securityToken
                },
                data: item
            });
    
            if (response.status === 200) {
                setInventory(inventory.filter(i =>
                    !(i.id === item.id)
                ));
            } else {
                alert('Failed to delete item.');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
        }
    };
    

    return (
        <>
        <NavBar />
        <div className="container">
            <h1>Store Inventory</h1>

            {/* Search Input */}
            <input
                type="text"
                placeholder="Search by name, category, or description..."
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                }}
                className="search-input"
            />

            {/* Inventory Table */}
            <table className="inventory-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    {currentItems.map((item, index) => {
                        const globalIndex = item.id;
                        return (
                            <tr key={index}>
                                {editIndex === globalIndex ? (
                                    <>
                                        <td><input type="text" name="name" value={editData.name} onChange={handleEditChange} /></td>
                                        <td><input type="text" name="category" value={editData.category} onChange={handleEditChange} /></td>
                                        <td><input type="text" name="description" value={editData.description} onChange={handleEditChange} /></td>
                                        <td><input type="number" name="price" value={editData.price} onChange={handleEditChange} /></td>
                                        <td><input type="number" name="quantity" value={editData.quantity} onChange={handleEditChange} /></td>
                                        <td>
                                            <button onClick={() => saveEdit(globalIndex)}>Save</button>
                                            <button onClick={() => cancelEdit()}>Cancel</button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td>{item.name}</td>
                                        <td>{item.category}</td>
                                        <td>{item.description}</td>
                                        <td>Rs.{item.price}</td>
                                        <td>{item.quantity}</td>
                                        <td>
                                            <button onClick={() => startEdit(globalIndex)}>Edit</button>
                                            <button onClick={() => deleteItem(item)}>Delete</button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="pagination">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)}>
                        Previous
                    </button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)}>
                        Next
                    </button>
                </div>
            )}

            {/* Add Item Form */}
            <h2>Add New Item</h2>
            <form className="form" onSubmit={handleSubmit}>
                {['name', 'category', 'description', 'price', 'quantity'].map((field) => (
                    <div key={field} className="form-group">
                        <label>{field.charAt(0).toUpperCase() + field.slice(1)}:</label>
                        <input
                            type={field === 'price' || field === 'quantity' ? 'number' : 'text'}
                            name={field}
                            value={formData[field]}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                ))}
                <button type="submit">Add Item</button>
            </form>
        </div>
        </>
    );
};

export default StoreInventory;