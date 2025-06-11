
sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
     "../utils/validation",
	 "sap/m/MessageToast",
], function (
	BaseController,
	JSONModel,
	utils,
	MessageToast
) {
	"use strict";

	return BaseController.extend("sap.kt.com.minihrsolution.controller.PurchaseOrderObject", {
		onInit: function () {
			this.getOwnerComponent().getRouter().getRoute("PurchaseOrderObject").attachMatched(this._onRouteMatched, this);
		},
		_onRouteMatched: async function (oEvent){
                       this.getBusyDialog()
			     this.PoNumber = oEvent.getParameter("arguments").sPath;

					  this.byId("FPO_id_CustomerName").setEditable(true)
                      this.getView().byId("POO_idSubmitButton").setVisible(true)
                      this.getView().byId("POO_idSaveButton").setVisible(false)
                      this.getView().byId("POO_ideditButton").setVisible(false)
                      this.getView().byId("FPO_id_LUT").setVisible(false)

                     this.byId("FPO_id_StartDate").setEditable(true)
                     this.byId("FPO_id_EndDate").setEditable(true)
                     this.byId("FPO_id_Date").setEditable(true)
					 this.byId("PO_id_Type").setEditable(true)
					 this.byId("FPO_idRichTextEditor").setEditable(true)
                         this.byId("POO_idAddItemButton").setVisible(true)



			  var LoginFunction = await this.commonLoginFunction("PurchaseOrder");
                if (!LoginFunction) return;
				     var Layout = this.byId("ObjectPageLayout");
            Layout.setSelectedSection(this.byId("purchaseOrderHeaderSection")); 
            this.i18nModel = this.getView().getModel("i18n").getResourceBundle();



            await this._fetchCommonData("ManageCustomer", "ManageCustomerModel");

			 var enddate = this.getView().byId("FPO_id_EndDate");
			 this.getView().byId("FPO_id_StartDate").attachChange(function (oEvent) {
                        var startDate = oEvent.getSource().getDateValue();
                          enddate.setMinDate(startDate);
                    });
			 this.getView().byId("FPO_id_Date").setMinDate(new Date());		

            var model = new JSONModel({
                "CustomerName": "",
                "Type": "",
                "Address": "",
                "StartDate": "",
                "EndDate": "",
                "PAN": "",
                "CurrentDate": "",
                "Description": "",
                "Unit": "",
                "Amount": "",
                "Currency": "",
                "Notes":"",
				"GSTIN": "",
				"customerEmail": "",
				"mobileNo":"",
                "Tax":"",
                "LUT":"",
                "STDCode":"",
                "PurchaseOrders": [],

            })
            this.getView().setModel(model, "PurchaseOrderModel");
            this.getView().getModel("PurchaseOrderModel").setProperty("/Editable",true);

			//   var Layout = this.byId("ObjectPageLayout");
            // Layout.setSelectedSection(this.byId("purchaseOrderSection")); 
			// this._ViewDatePickersReadOnly(["FPO_id_StartDate", "FPO_id_EndDate", "FPO_id_Date"],this.getView());
			if(oEvent.getParameter("arguments").sPath !== "null") {
				this.getView().byId("POO_idSubmitButton").setVisible(false)
                 this.getView().byId("POO_idSaveButton").setVisible(true)
                      this.getView().byId("POO_ideditButton").setVisible(true)

			     this.PoNumber = oEvent.getParameter("arguments").sPath;
                 await this.ajaxReadWithJQuery("PurchaseOrderItems", { PoNumber: this.PoNumber }).then((oData) => {
                                var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
                                this.getOwnerComponent().setModel(new JSONModel(oFCIAerData), "objectModel");
                
                                const purchaseOrderData = oFCIAerData[0];
                                const purchaseOrderModel = this.getView().getModel("PurchaseOrderModel");
                
                                purchaseOrderModel.setProperty("/CustomerName", purchaseOrderData.PurchaseOrder[0].CustomerName);
                                purchaseOrderModel.setProperty("/Type",  purchaseOrderData.PurchaseOrder[0].Type);
                                purchaseOrderModel.setProperty("/Address", purchaseOrderData.PurchaseOrder[0].Address);
                                purchaseOrderModel.setProperty("/StartDate", new Date(purchaseOrderData.PurchaseOrder[0].StartDate).toLocaleDateString('en-GB'));                                purchaseOrderModel.setProperty("/EndDate", purchaseOrderData.PurchaseOrder[0].EndDate);
                                purchaseOrderModel.setProperty("/PAN",  purchaseOrderData.PurchaseOrder[0].PAN);
                                purchaseOrderModel.setProperty("/CurrentDate", new Date(purchaseOrderData.PurchaseOrder[0].CurrentDate).toLocaleDateString('en-GB'));
                                purchaseOrderModel.setProperty("/EndDate",   new Date(purchaseOrderData.PurchaseOrder[0].EndDate).toLocaleDateString('en-GB'));
                                purchaseOrderModel.setProperty("/GSTIN", purchaseOrderData.PurchaseOrder[0].GST);
                                purchaseOrderModel.setProperty("/mobileNo", purchaseOrderData.PurchaseOrder[0].MobileNumber);
                                purchaseOrderModel.setProperty("/customerEmail", purchaseOrderData.PurchaseOrder[0].Email);
                                purchaseOrderModel.setProperty("/PurchaseOrders", purchaseOrderData.PurchaseOrderItems);
                                purchaseOrderModel.setProperty("/Notes", purchaseOrderData.PurchaseOrder[0].Notes);
                                purchaseOrderModel.setProperty("/STDCode", purchaseOrderData.PurchaseOrder[0].STDCode);

                                this.byId("FPO_id_CustomerName").setEditable(false)
                                this.byId("FPO_id_StartDate").setEditable(false)
                                this.byId("FPO_id_EndDate").setEditable(false)
                                this.byId("FPO_id_Date").setEditable(false)
                                this.byId("PO_id_Type").setEditable(false)
                                this.byId("FPO_idRichTextEditor").setEditable(false)
                                this.byId("POO_idAddItemButton").setVisible(false)
                               this.getView().byId("POO_idSaveButton").setVisible(false)
                               this.getView().byId("POO_idClearButton").setVisible(false)


                                
                                purchaseOrderModel.setProperty("/Editable",false);
                                 // this.byId("PO_id_Consultantname").setEditable(false)


                                   
                                                          

                            });		


						}
							
						this.closeBusyDialog()
		},
		PO_onButtonPress: function () {
			this.getRouter().navTo("PurchaseOrder");

		},
		   PO_onComboBoxChange: function () {
			var selectedkey= this.byId("FPO_id_CustomerName").getSelectedKey();    
            var Customer = this.getView().getModel("ManageCustomerModel").getData().find(function (cust) {
                return cust.name ===  selectedkey
			      });
            this.getView().getModel("PurchaseOrderModel").setProperty("/Address", Customer.address);
            this.getView().getModel("PurchaseOrderModel").setProperty("/PAN", Customer.PAN);
            this.getView().getModel("PurchaseOrderModel").setProperty("/GSTIN", Customer.GST);
            this.getView().getModel("PurchaseOrderModel").setProperty("/customerEmail", Customer.customerEmail);
            this.getView().getModel("PurchaseOrderModel").setProperty("/mobileNo", Customer.mobileNo);
            this.getView().getModel("PurchaseOrderModel").setProperty("/Tax", Customer.value);
            this.getView().getModel("PurchaseOrderModel").setProperty("/STDCode", Customer.stdCode);


         if (Customer.LUT && Customer.LUT.trim() !== ""){
                this.getView().byId("FPO_id_LUT").setVisible(true)
            this.getView().getModel("PurchaseOrderModel").setProperty("/LUT", Customer.LUT);
                      }else{
                this.getView().byId("FPO_id_LUT").setVisible(false)

                      }

            

             this.byId("FPO_id_CustomerName").setValueState("None");
        },
		onAddItemButtonPress: function () {
            var oModel = this.getView().getModel("PurchaseOrderModel");
            var aData = oModel.getProperty("/PurchaseOrders") || [];

            aData.push({
                ConsultantName:"",
                Description: "",
                Unit: "",
                Amount: "",
                Currency: "",
                Period:""
             });

            oModel.setProperty("/PurchaseOrders", aData);
        },
		  PO_onAmountInputChange: function (oEvent) {
            utils._LCvalidateAmount(oEvent);
        },
		  POO_onSubmitButtonPress: async function () {
           

            //
            var oModel = this.getView().getModel("PurchaseOrderModel").getData()
            try{
            if (utils._LCvalidateMandatoryField(this.getView().byId("FPO_id_CustomerName"), "ID") 
                && utils._LCvalidateDate(this.getView().byId("FPO_id_StartDate"), "ID") &&
                utils._LCvalidateDate(this.getView().byId("FPO_id_EndDate"), "ID")
                &&
                utils._LCvalidateDate(this.getView().byId("FPO_id_Date"), "ID")
                &&
              
               this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").every(function(item) {
                   return item.Description && item.Unit && item.Amount
               })&&this.getView().getModel("PurchaseOrderModel").getProperty("/Notes")&&     
               this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").length > 0         
               ) {
                var data = {
                    "CustomerName": oModel.CustomerName,
                    "Address": oModel.Address,
                    "StartDate": oModel.StartDate.split('/').reverse().join('-'),
                    "EndDate": oModel.EndDate.split('/').reverse().join('-'),
                    "PAN": oModel.PAN,
                    "CurrentDate": oModel.CurrentDate.split('/').reverse().join('-'),
                    "Type": oModel.Type || "internal",
                    "Notes": oModel.Notes,
                    "MobileNumber":oModel.mobileNo,
                    "GST":oModel.GSTIN,
                    "Email":oModel.customerEmail,
                    "TaxPercentage":oModel.Tax,
                    "STDCode":oModel.STDCode,
                    "LUT":oModel.LUT

                };
                var Items = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").map(function (item, index) {

                    var itemObj = {
                        data: {
                            "ConsultantName":item.ConsultantName,
                            "Description": item.Description,
                            "Unit": item.Unit,
                            "Amount": item.Amount,
                            "Currency": item.Currency || "INR",
                            "Period":item.Period || "Per Day"
                        }
                    };
                    // if (selectedItem) {
                    //     if (item.ItemId) {
                    //         itemObj.filters = { ItemId: item.ItemId };
                    //     }
                    //     else {
                    //         itemObj.filters = { flag: "create", PoNumber: selectedItem.getBindingContext("POModel").getObject().PoNumber };
                    //         itemObj.data.PoNumber = selectedItem.getBindingContext("POModel").getObject().PoNumber;
                            
                    //     }
                    // }
                    return itemObj;
                });

                    var oPayLoad = {
                        data,
                        Items
                    }
                    this.ajaxCreateWithJQuery("PurchaseOrder", oPayLoad);
                    MessageToast.show(this.i18nModel.getText("purchaseOrderCreated"));
              
	              await this.onSuccessDialog();
					// this.getRouter().navTo("PurchaseOrder");


            } else {
                MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));

            }
        } 
            catch(e) {
               MessageToast.show(this.i18nModel.getText("technicalError"));

                    console.error(e);
            }
        },
		onSuccessDialog: function() {
              if (!this._oDialog) {
                  this._oDialog = new sap.m.Dialog({
                      title: "Success",
                      type: "Message",
                      state: "Success",
                      content: new sap.m.Text({
                          text: "PO Created Successfully"
                      }),
                      endButton: new sap.m.Button({
                          text: "OK",
						  type: "Accept",
                          press: function() {
                              this._oDialog.close();
                                this.getRouter().navTo("PurchaseOrder");

                          }.bind(this)
                      }),
                     
                  });
                  this.getView().addDependent(this._oDialog);
              }
              this._oDialog.open();
          },
		  POO_onSaveButtonPress:function(oEvent){
            this.getRouter().getRoute("PurchaseOrder")
         const purchaseOrderModel = this.getView().getModel("PurchaseOrderModel");

            var oModel = this.getView().getModel("PurchaseOrderModel").getData()


			if (utils._LCvalidateMandatoryField(this.getView().byId("FPO_id_CustomerName"), "ID") &&
                utils._LCvalidateMandatoryField(this.getView().byId("FPO_id_Address"), "ID") &&
                utils._LCvalidateMandatoryField(this.getView().byId("FPO_id_PanNo"), "ID")
                && utils._LCvalidateDate(this.getView().byId("FPO_id_StartDate"), "ID") &&
                utils._LCvalidateDate(this.getView().byId("FPO_id_EndDate"), "ID")
                &&
                utils._LCvalidateDate(this.getView().byId("FPO_id_Date"), "ID")
                &&
              
               this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").every(function(item) {
                   return item.Description && item.Unit && item.Amount
               })&&this.getView().getModel("PurchaseOrderModel").getProperty("/Notes")&&     
               this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").length > 0         
               ){
				 var data = {
                    "CustomerName": oModel.CustomerName,
                    "Address": oModel.Address,
                    "StartDate": oModel.StartDate.split('/').reverse().join('-'),
                    "EndDate": oModel.EndDate.split('/').reverse().join('-'),
                    "PAN": oModel.PAN,
                    "CurrentDate": oModel.CurrentDate.split('/').reverse().join('-'),
                    "Type": oModel.Type || "internal",
                    "Notes": oModel.Notes,
                    "MobileNumber":oModel.mobileNo,
                    "GST":oModel.GSTIN,
                    "Email":oModel.customerEmail,
                    "TaxPercentage":oModel.Tax,
                    "STDCode":oModel.STDCode,
                    "LUT":oModel.LUT

                };
				var Items = this.getView().getModel("PurchaseOrderModel").getProperty("/PurchaseOrders").map(function (item, index) {

                    var itemObj = {
                        data: {
                            "ConsultantName":item.ConsultantName,
                            "Description": item.Description,
                            "Unit": item.Unit,
                            "Amount": item.Amount,
                            "Currency": item.Currency || "INR",
                            "Period":item.Period || "Per Day"
                        }
                    };
                        if (item.ItemId) {
                            itemObj.filters = { ItemId: item.ItemId };
                        }
                        else {
                            itemObj.filters = { flag: "create", PoNumber: this.PoNumber };
                            itemObj.data.PoNumber =  this.PoNumber;               
                            
                        }
                    return itemObj;
                }.bind(this));
			   }
			     const filters = {
                        PoNumber:this.PoNumber,

                    }
                    var PayLoad = {
                        data,
                        filters,
                        Items,
                    }
                    this.ajaxUpdateWithJQuery("PurchaseOrder", PayLoad);
                    MessageToast.show(this.i18nModel.getText("purchaseOrderupdated"));
                    this.getView().byId("POO_idSaveButton").setVisible(false)
                    this.getView().byId("POO_ideditButton").setVisible(true)
                      this.byId("FPO_id_CustomerName").setEditable(false)
                                this.byId("FPO_id_StartDate").setEditable(false)
                                this.byId("FPO_id_EndDate").setEditable(false)
                                this.byId("FPO_id_Date").setEditable(false)
                                this.byId("PO_id_Type").setEditable(false)
                                this.byId("FPO_idRichTextEditor").setEditable(false)
                                this.byId("POO_idAddItemButton").setVisible(false)
                                this.byId("POO_idClearButton").setVisible(false)

                                
                                purchaseOrderModel.setProperty("/Editable",false);
                    
		  },
           onClearNotesPress:function(){
            this.getView().getModel("PurchaseOrderModel").setProperty("/Notes","")
        },
                      POO_onEditButtonPress: function(){
                                const purchaseOrderModel = this.getView().getModel("PurchaseOrderModel");

                                   this.byId("FPO_id_CustomerName").setEditable(true)
							      this.byId("FPO_id_StartDate").setEditable(true)
                                  this.byId("FPO_id_EndDate").setEditable(true)
                                  this.byId("FPO_id_Date").setEditable(true)
							      this.byId("PO_id_Type").setEditable(true)
							      this.byId("FPO_idRichTextEditor").setEditable(true)
                                  this.byId("POO_idAddItemButton").setVisible(true)
                                  this.byId("POO_idClearButton").setVisible(true)


                                purchaseOrderModel.setProperty("/Editable",true);
                                this.getView().byId("POO_idSaveButton").setVisible(true)

        },
           FPO_onDateChange:function(oEvent){
              utils._LCvalidateDate(oEvent)
        },
                 POO_onPOTableDelete:function(oEvent){
                    const purchaseOrderModel = this.getView().getModel("PurchaseOrderModel");
                    const oTable = this.byId("idTable");
                    oTable.setMode(purchaseOrderModel.getProperty("/Editable") ? "Delete" : "None");
                    
                               var oSelectedItem = oEvent.getParameter("listItem");
                               var oModel = this.getView().getModel("PurchaseOrderModel");
                               var oData = oModel.getProperty("/PurchaseOrders");
                               var sPath = oSelectedItem.getBindingContext("PurchaseOrderModel").getPath();
                               var iIndex = parseInt(sPath.split("/")[2]);
                               var oDeletedItem = oData[iIndex];
                   
                               if (oDeletedItem.ItemId) {
                                   var payload = {
                                       filters: {
                                           ItemId: oDeletedItem.ItemId
                                       }
                                   };
                                   this.ajaxDeleteWithJQuery("PurchaseOrderItems", payload);
                                   MessageToast.show(this.i18nModel.getText("Item Deleted"));
                               }
                   
                               oData.splice(iIndex, 1);
                               oModel.setProperty("/PurchaseOrders", oData);
                   
        }
  
	});
});