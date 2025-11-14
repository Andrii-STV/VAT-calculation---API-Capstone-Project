import dotenv from 'dotenv';
dotenv.config()
const VATLAYER_API_KEY = process.env.VATLAYER_API_KEY;
const EXTRACTA_API_KEY = process.env.EXTRACTA_API_KEY;

import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const port = 3000;


//Vatlayer API routes
const vatlayerServer = 'https://apilayer.net/api/';
const validateEndPoint = "validate";

//Extracta API routes
const extractaServer = 'https://api.extracta.ai/api/v1';
const extractaCreateExtractionRoute = '/createExtraction';

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
        res.render("index.ejs", {
            content: JSON.stringify(response.data)
        });
    } catch (error) {
        res.render("index.ejs", {
            content: error
        });
        // throw error.response ? error.response.data : new Error('An unknown error occurred');
    }
});

app.listen(port, ()=> {
    console.log(`Server is running on port ${port}`);
});