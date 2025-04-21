
sap.ui.define([
    "./BaseController",
    "../utils/validation",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "../model/formatter",
    'sap/ui/export/Spreadsheet',
    "sap/ui/core/Core",
    "sap/ui/core/BusyIndicator",
    

],
    function (BaseController, utils, JSONModel, MessageToast, MessageBox, Formatter,Spreadsheet,Core,BusyIndicator) {
        "use strict";
        return BaseController.extend("sap.kt.com.minihrsolution.controller.IncomeAsset", {
            Formatter: Formatter,
                    onInit: function () {
                        this.getRouter().getRoute("RouteIncomeAsset").attachMatched(this._onRouteMatched, this);
           },			
           _onRouteMatched:function(){
            this.commonLoginFunction("IncomeAsset");
                let loginModel = this.getView().getModel("LoginModel").getData();
              this.i18nModel = this.getView().getModel("i18n").getResourceBundle();
              
                            var model = new JSONModel({
                                 "Type": "Mouse",
                                 "Model": "",
                                 "Description":"",
                                 "EquipmentNumber": "",
                                 "SerialNumber": "",
                                 "AssetCreationDate": "",
                                 "AssignBranch": "",
                                 "Status": "Unassigned",
                                 "TrashDate": "",
                                 "PickedEmployeeName": loginModel.EmployeeName
                               })
                     this.getView().setModel(model, "CreateIncomeAssetModel");

                    
                 this.IA_CommonReadCall("");
                 this._fetchCommonData("AssetType", "oAssetTypeModel");
				this._fetchCommonData("Currency", "oCurrencyModel");
				this._fetchCommonData("BaseLocation", "branchModel");
				this._FragmentDatePickersReadOnly(["FCIA_id_Date"])
                this._fetchCommonData("AllLoginDetails","EmpModel",{})

                this.getView().getModel("LoginModel").setProperty("/HeaderName", "Income Asset");
			},			onPressback: function () {
                this.getRouter().navTo("RouteTilePage");
            },
            onLogout: function () {
                 this.CommonLogoutFunction()
            },
            IA_CommonReadCall: function (filter) {
                BusyIndicator.show(0)
				this.ajaxReadWithJQuery("IncomeAsset", filter).then((oData) => {
					var oFCIAerData = Array.isArray(oData.data) ? oData.data : [oData.data];
					this.getOwnerComponent().setModel(new JSONModel(oFCIAerData), "incomeModel");
                    this._populateUniqueFilterValues(oFCIAerData);
                    BusyIndicator.hide();
                }).catch((error) => {
                    BusyIndicator.hide();
                    MessageToast.show(error.message || error.responseText);
                });
            },            
            _populateUniqueFilterValues: function (data) {
                let uniqueValues = {
                        IA_id_EqNo: new Set(),
                        IA_id_SlNo: new Set(),
                    };
        
                    data.forEach(item => {
                        uniqueValues.IA_id_EqNo.add(item.EquipmentNumber);  
                        uniqueValues.IA_id_SlNo.add(item.SerialNumber); 
                    });

                    let oView = this.getView();
                    ["IA_id_EqNo", "IA_id_SlNo"].forEach(field => {
                        let oComboBox = oView.byId(field);
                        oComboBox.destroyItems();
                        Array.from(uniqueValues[field]).sort().forEach(value => {
                            oComboBox.addItem(new sap.ui.core.Item({
                                key: value,
                                text: value
                            }));
                        });
                    });
                }, 
		
			IA_onCreateButtonPress: function () {  
                this._onRouteMatched();   
				var table=this.getView().byId("IA_id_OdataTable")			

				if (!this.FCIA_Dialog) {
					var oView = this.getView();
					this.FCIA_Dialog = sap.ui.xmlfragment("sap.kt.com.minihrsolution.fragment.CreateIncomeAsset", this);
					oView.addDependent(this.FCIA_Dialog);
					this._FragmentDatePickersReadOnly(["FCIA_id_Date"]);
                     table.removeSelections();
					this.FCIA_Dialog.open();
				} else {

					this.FCIA_Dialog.open();
                     sap.ui.getCore().byId("FCIA_id_model").setValue("").setValueState("None")
                     sap.ui.getCore().byId("FCIA_ID_DescriptionTextArea").setValue("").setValueState("None")
                     sap.ui.getCore().byId("FCIA_id_eqno").setValue("").setValueState("None")
					 sap.ui.getCore().byId("FCIA_id_slno").setValue("").setValueState("None")
                    //  sap.ui.getCore().byId("FCIA_id_pickedby").setSelectedKey("")
					 sap.ui.getCore().byId("FCIA_id_Date").setValue("").setValueState("None")
					 sap.ui.getCore().byId("FCIA_id_branch").setSelectedKey("").setValueState("None")
					sap.ui.getCore().byId("FCIA_id_assetvalue").setValue("").setValueState("None")
                    table.removeSelections();
 
				}
			},
            
            FCIA_onInputLiveChange: function (oEvent) {
				utils._LCvalidateMandatoryField(oEvent);
			},
			FCIA_oneqnolivechange: function (oEvent) {
				utils._LCvalidateMandatoryField(oEvent);
			},
			FCIA_onslnoInputLiveChange: function (oEvent) {
				utils._LCvalidateMandatoryField(oEvent);
			},
			FCIA_onpickbyInputLiveChange: function (oEvent) {
				utils._LCvalidateName(oEvent);
			},
			FCIA_onassetvalueInputLiveChange: function (oEvent) {
				utils._LCvalidateAssetValueField(oEvent);
			},
			FCIA_ondatechange: function (oEvent) {
				utils._LCvalidateDate(oEvent);
			},
			FCIA_assetammountlivechange: function (oEvent) {
				utils._LCvalidateAmount(oEvent);
			},
            FCIA_onbranchchange: function (oEvent) {
				utils._LCvalidateMandatoryField(oEvent);
			},
            FCIA_onDescriptionTextAreaChange: function (oEvent) {
				utils._LCvalidateMandatoryField(oEvent);
			},
          

			FCIA_onsavebuttonpress: async function () {
				var table = this.byId("IA_id_OdataTable");
				var selected = table.getSelectedItem();
                 
				var oModel=this.getView().getModel("CreateIncomeAssetModel").getData()
               try {
					if (
						utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FCIA_id_model"), "ID") &&
						utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FCIA_ID_DescriptionTextArea"), "ID") &&

						utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FCIA_id_eqno"), "ID") &&
						utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FCIA_id_slno"), "ID") 
					 &&
						utils._LCvalidateDate(sap.ui.getCore().byId("FCIA_id_Date"), "ID") &&
						utils._LCvalidateMandatoryField(sap.ui.getCore().byId("FCIA_id_branch"), "ID") &&
						utils._LCvalidateAmount(sap.ui.getCore().byId("FCIA_id_assetvalue"), "ID")
					) {
						var selectedBranch = sap.ui.getCore().byId("FCIA_id_branch").getSelectedItem() ;
						
						if (!selectedBranch) {
							MessageToast.show(this.i18nModel.getText("branchmessage"));
							return;
						}

						var oPayLoad = {
							"Type": oModel.Type,
							"Model": oModel.Model,
                            "Description": oModel.Description,
							"EquipmentNumber": oModel.EquipmentNumber,
							"SerialNumber": oModel.SerialNumber,
							"PickedEmployeeName": oModel.PickedEmployeeName,
							"AssetCreationDate": oModel.AssetCreationDate.split("/").reverse().join("-"),
                             "AssignBranch": oModel.AssignBranch,
							"AssetValue": oModel.AssetValue,
							"Currency": oModel.Currency,
							"Status": "Unassigned",
                            "TrashDate": null,
						};
                       

						if (!selected ) {
							await this.ajaxCreateWithJQuery("IncomeAsset",  { data: oPayLoad});
							MessageToast.show(this.i18nModel.getText("msgCustomer3"));
						} else {
                            var selectedData = selected.getBindingContext("incomeModel").getObject();
							await this.ajaxUpdateWithJQuery("IncomeAsset", { data: oPayLoad,filters: { SerialNumber:selectedData.SerialNumber,EquipmentNumber:selectedData.EquipmentNumber} });
							MessageToast.show(this.i18nModel.getText("msgCustomer4")); 
						}
                          
			              this.IA_onSearch()
                          this.FCIA_Dialog.close();
			
					}                    
                     else {
				     MessageToast.show(this.i18nModel.getText("mandatoryFieldsError"));
                                            }
				} catch (e) {
				     MessageToast.show(this.i18nModel.getText("technicalError"));

					console.error(e); 
				}
			},
           IA_onUpadateButtonPress: function () {
            var table = this.byId("IA_id_OdataTable");
            var selected = table.getSelectedItem();
              if (!selected) {
				     MessageToast.show(this.i18nModel.getText("selectUpdateRow"));

                return;
            }
            var Model = selected.getBindingContext("incomeModel");
            var data = Model.getObject();

            var oModel = this.getView().getModel("CreateIncomeAssetModel");
            if (data.Status === "Trashed") {
				     MessageToast.show(this.i18nModel.getText("updatemessage"));
                 return;
            }
          if (!this.FCIA_Dialog) {
                var oView = this.getView();
                this.FCIA_Dialog = sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.CreateIncomeAsset",
                    controller: this
                }).then(function (FCIA_Dialog) {
                    this.FCIA_Dialog = FCIA_Dialog;
                    oView.addDependent(this.FCIA_Dialog);
                    this._FragmentDatePickersReadOnly(["FCIA_id_Date"])
                  
                    oModel.setProperty("/Type",data.Type);
                    oModel.setProperty("/Model",data.Model);
                    oModel.setProperty("/Description",data.Description);
                    oModel.setProperty("/EquipmentNumber",data.EquipmentNumber);
                    oModel.setProperty("/SerialNumber",data.SerialNumber);
                    oModel.setProperty("/PickedEmployeeName",data.PickedEmployeeName);
                    sap.ui.getCore().byId("FCIA_id_Date").setDateValue(new Date(data.AssetCreationDate)).setValueState("None");
                    oModel.setProperty("/AssignBranch",data.AssignBranch);
                    oModel.setProperty("/AssetValue",data.AssetValue);
                    oModel.setProperty("/Currency",data.Currency);
                       this.FCIA_Dialog.open();
                }.bind(this));
            } else {
                this.FCIA_Dialog.open();
                var oCore=sap.ui.getCore()
                oCore.byId("FCIA_id_type").setSelectedKey(data.Type);
                oCore.byId("FCIA_id_model").setValue(data.Model).setValueState("None");
                 oModel.setProperty("/Description",data.Description);
                 oCore.byId("FCIA_id_eqno").setValue(data.EquipmentNumber).setValueState("None");
                 oCore.byId("FCIA_id_slno").setValue(data.SerialNumber).setValueState("None");
                oModel.setProperty("/PickedEmployeeName",data.PickedEmployeeName);
                oCore.byId("FCIA_id_Date").setDateValue(new Date(data.AssetCreationDate)).setValueState("None");
                oCore.byId("FCIA_id_branch").setSelectedKey(data.AssignBranch).setValueState("None");
                oCore.byId("FCIA_id_assetvalue").setValue(data.AssetValue).setValueState("None");
                oCore.byId("FCIA_id_currency").setSelectedKey(data.Currency)
                this._FragmentDatePickersReadOnly(["FCIA_id_Date"])
  }
		},		
		
		IA_onTrashButtonPress: function () {
            var table = this.byId("IA_id_OdataTable");
            var selected = table.getSelectedItem();
            if(!selected) {
			 return MessageToast.show(this.i18nModel.getText("selectTrashRow"));
             }
            var Model = selected.getBindingContext("incomeModel");
            var data = Model.getObject();
                if (data.Status === "Trashed"  ) {
				     MessageToast.show(this.i18nModel.getText("rowTrashed"));
                 return;
            }else if(data.Status==="Assigned"){
                MessageToast.show(this.i18nModel.getText("assigned"));
                return;
            }

            if (!selected) {
			 MessageToast.show(this.i18nModel.getText("selectTrashRow"));
             }
            if (!this.TF_Dialog) {
                var oView = this.getView();
                this.TF_Dialog = sap.ui.core.Fragment.load({
                    name: "sap.kt.com.minihrsolution.fragment.TrashIncomeAsset",
                    controller: this
                }).then(function (TF_Dialog) {
                    this.TF_Dialog = TF_Dialog;
                    oView.addDependent(this.TF_Dialog);
                    this._FragmentDatePickersReadOnly(["FTIA_id_Date"])

                    if (selected) {
                        this.TF_Dialog.open();
                    }
                }.bind(this));
            } else if (selected) {
                sap.ui.getCore().byId("FTIA_id_Date").setValue("")
                this.TF_Dialog.open();
            }
        },
		FTIA_onsavepress:async function () {
			var Date = sap.ui.getCore().byId("FTIA_id_Date").getValue()
            var table = this.byId("IA_id_OdataTable");
            var selected = table.getSelectedItem();
             if (!selected) {
			 MessageToast.show(this.i18nModel.getText("selectTrashRow"));
                  return;
            } 
			  if (selected) {
                var context = selected.getBindingContext("incomeModel");
                var selectedData = context.getObject();
                 if (Date !== "") {
                    selectedData.TrashDate = Date;
                    selectedData.Status = "Trashed";
                    var oPayLoad = {
                            "Status": "Trashed",
                            "TrashDate": Date
                              };
                 await  this.ajaxUpdateWithJQuery("IncomeAsset", { data: oPayLoad, filters: { SerialNumber: selectedData.SerialNumber }, });	
							MessageToast.show(this.i18nModel.getText("Trashed"));
                            this.IA_CommonReadCall("IncomeAsset")
                      this.TF_Dialog.close();
                    table.removeSelections();
            } else {
			       MessageToast.show(this.i18nModel.getText("selectDate"));

                }
            } else {
			       MessageToast.show(this.i18nModel.getText("noRowSelected"));
 }
        },

     
        IA_onSearch: function (oEvent) {
            var sEqNo = this.getView().byId("IA_id_EqNo").getSelectedKey();
            var sPickedBy = this.getView().byId("IA_id_PickedBy").getSelectedKey();
            var oDateRange = this.getView().byId("idOdataDateComboBox");
            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({ pattern: "yyyy-MM-dd" });
            var oStartDate = oDateRange.getDateValue();
            var oEndDate = oDateRange.getSecondDateValue();
            var slNo = this.getView().byId("IA_id_SlNo").getSelectedKey();
            var status=this.getView().byId("IA_id_Status").getSelectedKey();
        
            var filters = {};
        
            if (sEqNo) {
                filters.EquipmentNumber = sEqNo;
            }
        
            if (sPickedBy) {
                filters.PickedEmployeeName = sPickedBy;
            }
        
            if (oStartDate && oEndDate) {
                filters.CreationStartDate = oDateFormat.format(oStartDate);
                filters.CreationEndDate = oDateFormat.format(oEndDate);
            }
          if (slNo) {
                filters.SerialNumber = slNo;
            }
         if(status){
                filters.Status=status;
            }
            BusyIndicator.show(0);
         this._fetchCommonData("IncomeAsset", "incomeModel", filters).then(() => {  

            const data = this.getView().getModel("incomeModel").getData();
         }).finally(() => { 
            BusyIndicator.hide();
        });
        },        
         IA_onPressClear:function(){
			this.getView().byId("IA_id_EqNo").setSelectedKey("");
			this.getView().byId("IA_id_PickedBy").setSelectedKey("");
			this.getView().byId("idOdataDateComboBox").setValue("");
			this.getView().byId("IA_id_SlNo").setSelectedKey("");
			this.getView().byId("IA_id_Status").setSelectedKey("");
  },
			FTIA_onCancelPress: function () {
            this.TF_Dialog.close();
        },
		FCIA_onCancelButtonPress:function(){
            sap.ui.getCore().byId("FCIA_ID_DescriptionTextArea").setValueState("None")   
                     this.getView().byId("IA_id_OdataTable").removeSelections();
				this.FCIA_Dialog.close();

             },          
                 IA_onExport: function () {
                    const oTable = this.getView().byId("IA_id_OdataTable");
                    const oModelData = oTable.getModel("incomeModel").getData();
                
                    if (!oModelData || oModelData.length === 0) {
                        MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("noData"));
                        return;
                    }
                
                    const aCols = [
                        { label: "Type", property: "Type", type: "string" },
                        { label: "Model", property: "Model", type: "string" },
                        { label: "Equipment No", property: "EquipmentNumber", type: "string" },
                        { label: "Sl. No", property: "SerialNumber", type: "string" },
                        { label: "Picked By", property: "PickedEmployeeName", type: "string" },
                        { label: "Date", property: "AssetCreationDate", type: "Date", format: "yyyy-MM-dd" },
                        { label: "Branch", property: "AssignBranch", type: "string" },
                        { label: "Asset Value",  property: "AssetValue", type: "number" },
                        { label: "Currency", property: "Currency", type: "string" },
                        { label: "Status", property: "Status", type: "string" },
                        { label: "Trash Date", property: "TrashDate", type: "Date", formatter: ".formatDate" }                  
                      ];
                
                    const oSettings = {
                        workbook: { 
                            columns: aCols,
                            context: {
                                sheetName: "Income Asset"
                            }
                        },
                        dataSource: oModelData,
                        fileName: "IncomeAsset.xlsx"
                    };
                
                    const oSheet = new Spreadsheet(oSettings);
                    oSheet.build()
                        .then(function() {
                            MessageToast.show("Export Successful");
                        })
                        .catch(function(sMessage) {
                            MessageToast.show("Export Failed: " + sMessage);
                        })
                        .finally(function() {
                            oSheet.destroy();
                        });
                }                    
  });
});



