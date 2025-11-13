import express from "express";
import axios from "axios";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

const api = 'https://apilayer.net/api/';
const api_key = '50f5837618227869edc018f0ad3661ab';

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
        const response = await axios.get(api + validateEndPoint + "?access_key=" + api_key + "&vat_number=" + req.body.vatnumber);
        const result = response.data;
        console.log(req.body);
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