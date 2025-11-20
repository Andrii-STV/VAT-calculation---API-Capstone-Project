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
import { fileURLToPath } from 'url';
import multer from 'multer';
import ejs from 'ejs';

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

//Configuring Multer to temporarily store uploads
const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, '/tmp')
    },
    filename: (req, file, callback) => {
        callback(null, Date.now() + '-' + file.originalname)
    }
});

//Keeps uploaded files in a temporary storage
const upload = multer({ storage: storage });

//Vatlayer API routes
const vatlayerServer = 'https://apilayer.net/api/';
const validateEndPoint = "validate";
const priceEndPoint = "price";

//Extracta API routes
const extractaServer = 'https://api.extracta.ai/api/v1';
const extractaCreateExtractionRoute = '/createExtraction';
const extractaUploadFilesRoute = '/uploadFiles';
const extractaGetBatchResults = '/getBatchResults';

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
                        },
                        {
                            "key": "merchant_country_code",
                            "description": "country code of the country where merchant operates",
                            "example": "LT",
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
                    "key": "total_price_including_taxes",
                    "description": "The total amount after tax has been added. This should capture the final payable amount. Return only the number as a string.",
                    "example": "1027.00",
                    "type": "string"
                },
                {
                    "key": "type_of_goods",
                    "description": "Type of goods returned according to all items included in the receipt. Choose from the following types: some domestic passenger transport, hotel accommodation, district heating, books (excluding e-books), firewood, pharmaceutical products, medical equipment for disabled persons, newspapers and periodicals (some exceptions), intra-community and international transport, medical. If the goods in the receipt don't match any of these types, return empty string.",
                    "example": "pharmaceutical products",
                    "type": "string"
                }
            ]
        }
};

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));


app.get("/", async (req, res) => {

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
    }
    
//    res.render("index.ejs", {
//     content: "input your VAT number above to get the name of the company"
//    });
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

// app.post("/extract", async (req, res) => {

    
//     try {
//         const response = await axios.post(extractaServer + extractaCreateExtractionRoute, extactaExtractionDetailsJSON, {
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${EXTRACTA_API_KEY}`
//             }
//         });
//         const extractionId = response.data.extractionId;
//         req.session.currentExtractionId = extractionId;

//         res.render("index.ejs", {
//             content: JSON.stringify(response.data.extractionId)
//         });
//     } catch (error) {
//         res.render("index.ejs", {
//             content: error
//         });
//     }
// });


app.post ("/uploadFiles", upload.single('file'), async (req, res) => {
    
    const uploadedFile = req.file;
    const extractionId = req.session.currentExtractionId;
    if (!extractionId || !uploadedFile) {
        if (uploadedFile) fs.unlinkSync(uploadedFile.path);
        return res.render("index.ejs", {
            content: "No current extraction ID found. Please get back to homepage('/')."
        });
    };

    let formData = new FormData();
    const batchId = null;
    formData.append('extractionId', extractionId);

    try {
        formData.append('files', fs.createReadStream(uploadedFile.path));
    }catch (error) {
        fs.unlinkSync(uploadedFile.path);
        return res.status(500).render("index.ejs", { content: "Error reading uploaded file." });
    }
    if (batchId) {
        formData.append('batchId', batchId);
    }

    try {
        const response = await axios.post(extractaServer + extractaUploadFilesRoute, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${EXTRACTA_API_KEY}`
            }
        });
        fs.unlinkSync(uploadedFile.path);

        const batchId = response.data.batchId;
        req.session.currentBatchId = batchId;

        res.render("index.ejs", {
            content: JSON.stringify(response.data.extractionId),
            imageUrl: response.data.files[0].url
        });
    } catch (error) {
        res.render("index.ejs", {
            content: error,
        });
    }

});

app.post("/results", async (req, res) => {
    const batchId = req.session.currentBatchId;
    const extractionId = req.session.currentExtractionId;
    let extractaData = null;
    try {
        const payload = {
            extractionId,
            batchId
        };
        const extractaResponse = await axios.post(extractaServer + extractaGetBatchResults, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${EXTRACTA_API_KEY}`
            }
        });

        extractaData = extractaResponse.data;

        const vatNumber = extractaData.files[0].result.merchant.merchant_tax_id;
        const fullPrice = extractaData.files[0].result.total_price_including_taxes;
        const countryCode = extractaData.files[0].result.merchant.merchant_country_code;
        const typeOfGoods = extractaData.files[0].result.type_of_goods;
        const receiptImage = extractaData.files[0].url;
        console.log(vatNumber);


        const vatlayerValidateResponse = await axios.get(vatlayerServer + validateEndPoint + "?access_key=" + VATLAYER_API_KEY + "&vat_number=" + vatNumber);
        const vatlayerFullPriceResponse = await axios.get(vatlayerServer + priceEndPoint + "?access_key=" + VATLAYER_API_KEY + "&amount=" + fullPrice + "&country_code=" + countryCode + "&type=" + typeOfGoods + "&incl=1");
        
        const vatlayerValidateResult = vatlayerValidateResponse.data;
        const vatlayerFullPriceResult = vatlayerFullPriceResponse.data;


        res.render("results.ejs", {
            extractaContent: extractaData.batchId,

            vatlayerFullVatNumber: vatlayerValidateResult.query,
            vatlayerCountryCode: vatlayerValidateResult.country_code,
            vatlayerCompanyName: vatlayerValidateResult.company_name,
            vatlayerCompanyAddress: vatlayerValidateResult.company_address,
            
            vatlayerNetPrice: vatlayerFullPriceResult.price_excl_vat.toFixed(2),
            vatlayerFullPrice: vatlayerFullPriceResult.price_incl_vat,
            vatlayerVatRate: vatlayerFullPriceResult.vat_rate,
            vatlayerTypeOfGoods: vatlayerFullPriceResult.type,

            extractaReceiptImg: receiptImage
        });
    } catch(error) {

        let errorMessage = "An unknown error occurred.";
        if (extractaData === null) {
            errorMessage = `Extracta API Error: ${error.message}`;
        } else if (error.message.includes("critical data") || error.message.includes("unavailable")) {
             errorMessage = `Extraction Data Missing: ${error.message}`;
        } else {
            errorMessage = `Vatlayer API Error: ${error.message}`;
        }

        
        res.render("results.ejs", { 
            extractaContent: errorMessage,
            
            vatlayerFullVatNumber: 'N/A',
            vatlayerCountryCode: 'N/A',
            vatlayerCompanyName: 'Error Processing',
            vatlayerCompanyAddress: 'Error Processing',
            
            vatlayerNetPrice: 'N/A',
            vatlayerFullPrice: 'N/A',
            vatlayerVatRate: 'N/A',
            vatlayerTypeOfGoods: 'N/A',
            extractaReceiptImg: null
        });
    };
});


app.listen(port, ()=> {
    console.log(`Server is running on port ${port}`);
});