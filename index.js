import dotenv from 'dotenv';
dotenv.config()

import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

const vatlayerServer = 'https://apilayer.net/api/';
const VATLAYER_API_KEY = '50f5837618227869edc018f0ad3661ab';

const validateEndPoint = "validate";

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));


app.get("/", (req, res) => {
    
   res.render("index.ejs", {
    content: "input your VAT number above to get the name of the company"
   });
    console.log("getting homepage");
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

app.listen(port, ()=> {
    console.log(`Server is running on port ${port}`);
});