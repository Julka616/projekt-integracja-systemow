const express = require('express');
const soap = require('soap');
const jwt = require('jsonwebtoken');
const { GPUModel, GPUPrice, sequelize } = require('./models');

const app = express();
const PORT = 8001;
const SECRET = 'supersecret';

app.use('/soap', (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).send('Brak tokena');

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).send('Niepoprawny format tokena');


    try {
        const payload = jwt.verify(token, SECRET);
        req.user = payload;
        next();
    } catch (err) {
        return res.status(403).send('Niepoprawny token');
    }
});


const service = {
    GPUService: {
        GPUServiceSoapPort: {
            getAveragePrice: function(args, callback, soapHeaders, req) {
                const authHeader = req.headers['authorization'];
                if (!authHeader) {
                    return callback(new Error('Brak tokena'));
                }
                const token = authHeader.split(' ')[1];
                try {
                    jwt.verify(token, SECRET);
                } catch {
                    return callback(new Error('Niepoprawny token'));
                }

                const modelName = args.modelName;
                GPUModel.findOne({
                    where: { name: modelName },
                    include: GPUPrice
                }).then(model => {
                    if (!model || model.GPUPrices.length === 0) {
                        return callback(null, { averagePrice: -1 });
                    }

                    const avg = model.GPUPrices.reduce((sum, p) => sum + p.retailPrice, 0) / model.GPUPrices.length;
                    callback(null, { averagePrice: avg.toFixed(2) });
                }).catch(err => callback(err));
            }
        }
    }
};


const xml = `
<definitions name="GPUService"
  targetNamespace="http://example.com/gpu"
  xmlns:tns="http://example.com/gpu"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/">

  <message name="getAveragePriceRequest">
    <part name="modelName" type="xsd:string"/>
  </message>
  <message name="getAveragePriceResponse">
    <part name="averagePrice" type="xsd:float"/>
  </message>

  <portType name="GPUServicePortType">
    <operation name="getAveragePrice">
      <input message="tns:getAveragePriceRequest"/>
      <output message="tns:getAveragePriceResponse"/>
    </operation>
  </portType>

  <binding name="GPUServiceSoapBinding" type="tns:GPUServicePortType">
    <soap:binding style="rpc" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="getAveragePrice">
      <soap:operation soapAction="getAveragePrice"/>
      <input>
        <soap:body namespace="http://example.com/gpu" use="literal"/>
      </input>
      <output>
        <soap:body namespace="http://example.com/gpu" use="literal"/>
      </output>
    </operation>
  </binding>

  <service name="GPUService">
    <port name="GPUServiceSoapPort" binding="tns:GPUServiceSoapBinding">
      <soap:address location="http://localhost:${PORT}/soap"/>
    </port>
  </service>
</definitions>
`;


app.listen(PORT, async () => {
    await sequelize.sync();
    soap.listen(app, '/soap', service, xml);
    console.log(`🧼 SOAP service running at http://localhost:${PORT}/soap?wsdl`);
});
