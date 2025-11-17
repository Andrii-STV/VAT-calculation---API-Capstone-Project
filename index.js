import dotenv from 'dotenv';
dotenv.config()
const VATLAYER_API_KEY = process.env.VATLAYER_API_KEY;
const EXTRACTA_API_KEY = process.env.EXTRACTA_API_KEY;
const SECRET_SESSION_KEY = process.env.SECRET_SESSION_KEY;

import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import fs  from 'fs';
import FormData from "form-data";
import session from 'express-session';
import path from 'path';
import multer from 'multer';

const app = express();
const port = 3000;

//Session set up for storing API call outputs as global values
app.use(session ({
    secret: process.env.SECRET_SESSION_KEY,
    resave: false, // Prevents session from being saved back to the session store on every request
    saveUninitialized: true, // Forces a session that is uninitialized to be saved to the store
    cookie: { 
        secure: 'auto', // Secure cookies for production
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    } 
}));

//Vatlayer API routes
const vatlayerServer = 'https://apilayer.net/api/';
const validateEndPoint = "validate";

//Extracta API routes
const extractaServer = 'https://api.extracta.ai/api/v1';
const extractaCreateExtractionRoute = '/createExtraction';
const extractaUploadFilesRoute = '/uploadFiles';

//Extracta  Receipt descriptions JSON for creating Extraction
const extactaExtractionDetailsJSON = {
        "extractionDetails": {
            "name": "Receipt - Extraction",
            "language": "English",
            "options": {
                "hasTable": true,
                "handwrittenTextRecognition": false
            },
            "fields": [
                {
                    "key": "receipt_id",
                    "example": "1234567890",
                    "type": "string"
                },
                {
                    "key": "receipt_date",
                    "description": "the invoice date in the following format yyyy-mm-dd",
                    "example": "2022-01-01",
                    "type": "string"
                },
                {
                    "key": "merchant",
                    "description": "the merchant in the invoice",
                    "type": "object",
                    "properties": [
                        {
                            "key": "merchant_name",
                            "description": "name of the merchant",
                            "example": "Galactic Solutions",
                            "type": "string"
                        },
                        {
                            "key": "merchant_address",
                            "description": "address of the merchant",
                            "example": "789 Elm Rd, Seattle, WA 98109",
                            "type": "string"
                        },
                        {
                            "key": "merchant_tax_id",
                            "description": "tax id or vat id of the merchant",
                            "example": "123987456",
                            "type": "string"
                        }
                    ]
                },
                {
                    "key": "items",
                    "description": "the items in the receipt",
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": [
                            {
                                "key": "name",
                                "example": "Item 1",
                                "type": "string"
                            },
                            {
                                "key": "quantity",
                                "example": "1",
                                "type": "string"
                            },
                            {
                                "key": "unit_price",
                                "description": "return only the number as a string.",
                                "example": "100.00",
                                "type": "string"
                            },
                            {
                                "key": "total_price",
                                "description": "return only the number as a string.",
                                "example": "100.00",
                                "type": "string"
                            }
                        ]
                    }
                },
                {
                    "key": "total_tax_amount",
                    "description": "The amount of tax charged on the invoice. This is the tax figure listed separately from the sub-total. Return only the number as a string.",
                    "example": "163.97",
                    "type": "string"
                },
                {
                    "key": "grand_total",
                    "description": "The total amount after tax has been added. This should capture the final payable amount. Return only the number as a string.",
                    "example": "1027.00",
                    "type": "string"
                }
            ]
        }
};

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));


app.get("/", (req, res) => {
    
   res.render("index.ejs", {
    content: "input your VAT number above to get the name of the company"
   });
});

app.post("/submit-vat", async (req, res) => {
    try {
        const response = await axios.get(vatlayerServer + validateEndPoint + "?access_key=" + VATLAYER_API_KEY + "&vat_number=" + req.body.vatnumber);
        const result = response.data;
        res.render("index.ejs", {
            content: result.company_name,
            address: result.company_address
        });
    } catch (error) {
        res.render("index.ejs", {
            content: error.info
        });
    };
});

app.post("/extract", async (req, res) => {

    
    try {
        const response = await axios.post(extractaServer + extractaCreateExtractionRoute, extactaExtractionDetailsJSON, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${EXTRACTA_API_KEY}`
            }
        });
        const extractionId = response.data.extractionId;
        req.session.currentExtractionId = extractionId;

        res.render("index.ejs", {
            content: JSON.stringify(response.data.extractionId)
        });
    } catch (error) {
        res.render("index.ejs", {
            content: error
        });
        // throw error.response ? error.response.data : new Error('An unknown error occurred');
    }
});


app.post ("/uploadFiles", async (req, res) => {
    
    const extractionId = req.session.currentExtractionId;
    if (!extractionId) {
        return res.render("idnex.ejs", {
            content: "No current extraction ID found. Please create one first."
        });
    };

    let formData = new FormData();
    const batchId = null;
    const ASSETS_ROOT = path.join(process.cwd(), 'public');
    const files = [];
    files.push(path.join(ASSETS_ROOT, 'assets', '1000003096.jpg'));
    formData.append('extractionId', extractionId);
    if (batchId) {
        formData.append('batchId', batchId);
    }

    // Append files to formData
    files.forEach(file => {
        formData.append('files', fs.createReadStream(file));
    });

    //console.log() for debugging
    console.log("Attempting to post files to URL:", extractaServer + extractaUploadFilesRoute);
    try {
        const response = await axios.post(extractaServer + extractaUploadFilesRoute, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${EXTRACTA_API_KEY}`
            }
        });
        //console.log() for debugging
        console.log("Upload Success:", response.data.files[0].url);
        res.render("index.ejs", {
            content: JSON.stringify(response.data),
            imageUrl: response.data.files[0].url
        });
    } catch (error) {
        res.render("index.ejs", {
            content: error,
        });
    }
});

app.listen(port, ()=> {
    console.log(`Server is running on port ${port}`);
});