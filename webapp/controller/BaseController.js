sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "../utils/TraineeCertificatePDF",
  "../model/formatter",
  "sap/ui/core/BusyIndicator"
], function (Controller, JSONModel, jsPDF, Formatter, BusyIndicator) {
  "use strict";

  return Controller.extend("sap.kt.ktofferletter.products.controller.BaseController", {
    Formatter: Formatter,
    // Router Code 
    getRouter: function () {
      return sap.ui.core.UIComponent.getRouterFor(this);
    },


    getI18nText: function (sKey, aParams) {
      const oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
      return oResourceBundle.getText(sKey, aParams);
    },

    calculateDateDifference: function (endDate, sStatus) {
      var thresholdDays = 30;
      if (!endDate) return "None";
      var parts = endDate.split('/');
      var day = parseInt(parts[0], 10);
      var month = parseInt(parts[1], 10) - 1;
      var year = parseInt(parts[2], 10);

      var endDateObj = new Date(year, month, day);

      var now = new Date();

      var timeDiff = endDateObj - now;
      var daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

      if (daysDiff <= thresholdDays && sStatus === "Active") {
        return "Indication03";
      } else {
        return;
      }
    },

    CommonLogoutFunction: function () {
      var oLoginModel = this.getOwnerComponent().getModel("LoginModel");
      if (oLoginModel) {
        oLoginModel.setProperty("/EmployeeID", "");
        oLoginModel.setProperty("/EmployeeName", "");
      }
      this.getRouter().navTo("RouteLoginPage");
    },

    commonLoginFunction: function (value) {
      return new Promise((resolve) => {
        const oModel = this.getOwnerComponent().getModel("LoginModel");
        const TileModel = this.getView().getModel("AppVisibilityModel");

        const fail = () => {
          this.closeBusyDialog();
          this.getRouter().navTo("RouteLoginPage");
          resolve(false);
        };

        if (!oModel) return fail();

        const userId = oModel.getProperty("/EmployeeID");
        const userName = oModel.getProperty("/EmployeeName");

        if (!userId || !userName) {
          return fail();
        }

        if (value && TileModel) {
          const tileMap = {
            "EmployeeOffer": "/GenerateEmployeeOffer",
            "Holiday": "/ListOfHolidays",
            "SelfService": "/SelfService",
            "EmployeeDetails": "/EmployeeDetail",
            "TilePage": "/TilePage",
            "Quotation": "/A_Quotations",
            "Payroll": "/A_Payroll",
            "Trainee": "/Trainee",
            "Contract": "/GenerateContract",
            "ManageAssignment": "/AssignmentTask",
            "Expense": "/ExpenseApp",
            "MSA&SOW": "/GenerateMsaNda",
            "HrQuotation": "/QuotationApp",
            "PaySlip": "/PaySlip",
            "CompanyInvoice": "/InvoiceApp",
            "Leaves": "/Leaves",
            "ConsultantInvoice": "/ConsultantInvoice"

          };

          const modelPath = tileMap[value];
          if (modelPath && TileModel.getProperty(modelPath) === '0') {
            return fail();
          }
        }
        resolve(true);
      });
    },

    _fetchCommonData: async function (entityName, modelName, filter = "") {
      if (!this.getOwnerComponent().getModel("LoginModel")) {
        BusyIndicator.hide();
        return;
      }
      let url = this.getOwnerComponent().getModel("LoginModel").getData().url + entityName;
      try {
        await new Promise((resolve, reject) => {
          $.ajax({
            url: url,
            method: "GET",
            headers: this.getOwnerComponent().getModel("LoginModel").getData().headers,
            data: filter,
            success: function (data) {
              if (data) {
                var oModel = new JSONModel(data.data);
                this.getOwnerComponent().setModel(oModel, modelName);
              }
              resolve(data);
            }.bind(this),
            error: function (err) {
              reject(err);
            }
          });
        });

      } catch (error) {
        sap.m.MessageToast.show(error.responseJSON?.message || "Technical error, please contact the administrator");
      }
    },

    //Common read call for all the app
    async ajaxReadWithJQuery(sUrl, filter) {
      const queryString = new URLSearchParams(filter).toString();
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl + "?" + queryString,
          method: "GET",
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: (data) => {
            resolve(data);
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    },
    //Common create call for all the app
    async ajaxCreateWithJQuery(sUrl, oPayLoad) {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "POST",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
            reject(error);
          }
        });
      });
    },
    //Common update call for all the app
    async ajaxUpdateWithJQuery(sUrl, oPayLoad) {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "PUT",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
            reject(error);
          }
        });
      });
    },
    //Common delete call for all the app
    async ajaxDeleteWithJQuery(sUrl, oPayLoad) {
      return new Promise((resolve, reject) => {
        $.ajax({
          url: this.getView().getModel("LoginModel").getData().url + sUrl,
          method: "DELETE",
          contentType: "application/json",
          dataType: "json",
          data: JSON.stringify(oPayLoad),
          headers: this.getView().getModel("LoginModel").getData().headers,
          success: function (data) {
            resolve(data);
          },
          error: function (error) {
            reject(error);
          }
        });
      });
    },

    _calculateTDS: function (ctc) {
      if (!this.getView().getModel("TDSModel") || this.getView().getModel("TDSModel").getData().length === 0) {
        return 0;
      }
      var filtered = this.getView().getModel("TDSModel").getData().filter(function (item) {
        return ctc >= item.StartAmount && ctc <= item.EndAmount;
      });
      var ctcforTDS = ctc - filtered[0].StartAmount + 1;
      var tdsofctc = ctcforTDS * filtered[0].TaxPercentage / 100;
      var actualtds = tdsofctc + filtered[0].AutoCalculation;
      var finaltds = actualtds + (actualtds * 0.04);
      return +(finaltds.toFixed(2));
    },

    _calculatePT: function (ctc) {
      if (!this.getView().getModel("TDSModel") || this.getView().getModel("TDSModel").getData().length === 0) {
        return 0;
      }
      var filtered = this.getView().getModel("TDSModel").getData().filter(function (item) {
        return ctc >= item.StartAmount && ctc <= item.EndAmount;
      });
      var pt = filtered[0].PT;
      return pt;
    },

    _calculateSalaryComponents: function (isTDSIncluded) {
      var oModel = this.getView().getModel("employeeModel");
      // Convert and fetch values
      var CTC = parseFloat(oModel.getProperty("/CTC").replaceAll(",", ""));
      var VariableData = parseFloat(oModel.getProperty("/VariablePercentage"));
      var joiningBonus = parseFloat(oModel.getProperty("/JoiningBonus").replaceAll(",", ""));
      var VariablePay = CTC * VariableData / 100;

      var BasicSalary, HRA, EmployeerPF, MedicalInsurance, Gratuity, SpecailAllowance, Total;
      var DeductionPF, IncomeTax_TDS, PT, DeductionTotal, GrossPay;
      var newCTC = CTC - VariablePay;
      if (isTDSIncluded === "TDS") {
        BasicSalary = newCTC * 40 / 100;
        HRA = BasicSalary * 40 / 100;
        EmployeerPF = 0;
        MedicalInsurance = BasicSalary * 40 / 100;
        Gratuity = BasicSalary * 4.81 / 100;
        SpecailAllowance = newCTC - (BasicSalary + HRA + EmployeerPF + MedicalInsurance + Gratuity);
        Total = BasicSalary + HRA + MedicalInsurance + EmployeerPF + Gratuity + SpecailAllowance;

        DeductionPF = 0;
        IncomeTax_TDS = this._calculateTDS(CTC);
        PT = this._calculatePT(CTC);
        DeductionTotal = DeductionPF + PT + IncomeTax_TDS;
        GrossPay = (Total - DeductionTotal);

      } else {
        BasicSalary = newCTC * 40 / 100;
        HRA = BasicSalary * 40 / 100;
        EmployeerPF = BasicSalary * 13 / 100;
        MedicalInsurance = BasicSalary * 40 / 100;
        Gratuity = BasicSalary * 4.81 / 100;
        SpecailAllowance = newCTC - (BasicSalary + HRA + EmployeerPF + MedicalInsurance + Gratuity);
        Total = BasicSalary + HRA + EmployeerPF + MedicalInsurance + Gratuity + SpecailAllowance;

        DeductionPF = BasicSalary * 12 / 100;
        IncomeTax_TDS = this._calculateTDS(CTC);
        PT = this._calculatePT(CTC);
        DeductionTotal = DeductionPF + PT + IncomeTax_TDS;
        GrossPay = (Total - DeductionTotal);
      }
      var CostToCompany = GrossPay + DeductionTotal + VariablePay;
      // Set model properties
      oModel.setProperty("/BasicSalary", Math.round(BasicSalary));
      oModel.setProperty("/HRA", Math.round(HRA));
      oModel.setProperty("/EmployerPF", Math.round(EmployeerPF));
      oModel.setProperty("/MedicalInsurance", Math.round(MedicalInsurance));
      oModel.setProperty("/Gratuity", Math.round(Gratuity));
      oModel.setProperty("/SpecailAllowance", Math.round(SpecailAllowance));
      oModel.setProperty("/Total", Math.round(Total));

      oModel.setProperty("/EmployeePF", Math.round(DeductionPF));
      oModel.setProperty("/PT", Math.round(PT));
      oModel.setProperty("/IncomeTax", Math.round(IncomeTax_TDS));
      oModel.setProperty("/TotalDeduction", Math.round(DeductionTotal));
      oModel.setProperty("/GrossPay", Math.round(GrossPay));
      oModel.setProperty("/GrossPayMontly", Math.round(GrossPay / 12));

      oModel.setProperty("/VariablePay", Math.round(VariablePay));
      oModel.setProperty("/CostofCompany", Math.round(CostToCompany));
    },

    //Date picker common function 
    _makeDatePickersReadOnly: function (aIds) {
      var oView = this.getView();
      aIds.forEach(function (sId) {
        var oControl = oView.byId(sId);
        if (oControl) {
          var bIsValueHelp = oControl.getMetadata().getName() === "sap.m.Input" && oControl.getShowValueHelp && oControl.getShowValueHelp();

          oControl.addEventDelegate({
            onAfterRendering: function () {
              var oDomRef = oControl.getDomRef("inner");
              if (oDomRef) {
                oDomRef.setAttribute("readonly", true); // block typing
                oDomRef.style.cursor = "pointer";
              }
            }
          }, oControl);

          oControl.attachBrowserEvent("click", function () {
            var oIcon = oControl.getDomRef("icon");
            if (oIcon) {
              oIcon.click(); // open calendar or value help
            }
          });

          // Optional: prevent typing via keypress too (extra safe)
          oControl.attachBrowserEvent("keydown", function (oEvent) {
            oEvent.preventDefault();
          });
        }
      });
    },

    //fragment date picker function
    _FragmentDatePickersReadOnly: function (aIds) {
      aIds.forEach(function (sId) {
        var oDatePicker = sap.ui.getCore().byId(sId);
        if (oDatePicker) {
          oDatePicker.addEventDelegate({
            onAfterRendering: function () {
              var oInputDom = oDatePicker.getDomRef("inner");
              if (oInputDom) {
                oInputDom.setAttribute("readonly", true); // Prevent typing
                oInputDom.style.cursor = "pointer";
              }
            }
          }, oDatePicker);
          // Open calendar on click
          oDatePicker.attachBrowserEvent("click", function () {
            var oIconDomRef = oDatePicker.getDomRef("icon");
            if (oIconDomRef) {
              oIconDomRef.click(); // simulate icon click to open calendar
            }
          });
        }
      });
    },

    _convertBLOBtoBASE64: function (buffer) {
      if (!buffer || buffer.byteLength === 0) {
        console.error("Invalid BLOB data.");
        return "";
      }

      var binary = '';
      var bytes = new Uint8Array(buffer);

      for (var i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }

      var base64String = btoa(binary); // Convert binary string to Base64

      // Calculate size in bytes (1 character in base64 = 1 byte)
      var base64Length = base64String.length;
      var approxSizeInKB = base64Length * 0.75 / 1024; // base64 is ~33% larger than original binary
      var approxSizeInMB = approxSizeInKB / 1024;

      console.log("Base64 string size: " + base64Length + " characters");
      console.log("Approx. size: " + approxSizeInKB.toFixed(2) + " KB (" + approxSizeInMB.toFixed(2) + " MB)");

      return base64String;
    },

    _convertBLOBToImage: function (oBlob) {
      return new Promise((resolve, reject) => {
        const oImage = new Image();
        oImage.onload = function () {
          const MAX_WIDTH = 800;
          const scale = MAX_WIDTH / oImage.width;
          const canvas = document.createElement("canvas");
          canvas.width = MAX_WIDTH;
          canvas.height = oImage.height * scale;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(oImage, 0, 0, canvas.width, canvas.height);

          const compressedDataUrl = canvas.toDataURL("image/png"); // Preserves transparency
          resolve(compressedDataUrl);
        };
        oImage.onerror = function () {
          reject("Image load failed");
        };
        oImage.src = URL.createObjectURL(oBlob);
      });
    },

    handleFileUpload: function (
      oEvent,
      oContext,
      sModelName,
      sAttachmentPath,
      sNamePath,
      sUploadFlagPath,
      sSuccessTextKey,
      sDuplicateTextKey,
      sNoFileKey,
      sErrorKey,
      fnValidateCallback
    ) {
      var that = this;
      const oFileUploader = oEvent.getSource();
      const oFiles = oFileUploader.oFileUpload.files;
      const oModel = oContext.getView().getModel(sModelName);
      const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20 MB

      // No file selected
      if (!oFiles.length) {
        sap.m.MessageToast.show(oContext.getI18nText(sNoFileKey));
        return;
      }

      let attachments = oModel.getProperty(sAttachmentPath) || [];
      let uploadedFileNames = oModel.getProperty(sNamePath)
        ? oModel.getProperty(sNamePath).split(", ")
        : [];
      let currentTotalSize = attachments.reduce((sum, file) => sum + file.size, 0);

      // Calculate total size including new files
      let newFilesTotalSize = Array.from(oFiles).reduce((sum, file) => sum + file.size, 0);
      let finalTotalSize = currentTotalSize + newFilesTotalSize;

      // Check total size constraint
      if (finalTotalSize > MAX_TOTAL_SIZE) {
        sap.m.MessageToast.show("Total file size should not exceed 20 MB.");
        return;
      }

      Array.from(oFiles).forEach((oFile) => {
        if (uploadedFileNames.includes(oFile.name)) {
          sap.m.MessageToast.show(oContext.getI18nText(sDuplicateTextKey, [oFile.name]));
          return;
        }

        const oReader = new FileReader();
        oReader.onload = (e) => {
          const sFileBinary = e.target.result.split(",")[1];

          attachments.push({
            filename: oFile.name,
            contentType: oFile.type,
            content: sFileBinary,
            encoding: "base64",
            size: oFile.size // Store file size for future calculations
          });

          oModel.setProperty(sAttachmentPath, attachments);
          oModel.setProperty(sUploadFlagPath, true);

          uploadedFileNames.push(oFile.name);
          oModel.setProperty(sNamePath, uploadedFileNames.join(", "));

          sap.m.MessageToast.show(oContext.getI18nText(sSuccessTextKey, [oFile.name]));

          // Re-validate button
          if (typeof fnValidateCallback === "function") {
            fnValidateCallback.call(oContext);
          }
        };

        oReader.onerror = () => {
          sap.m.MessageToast.show(oContext.getI18nText(sErrorKey, [oFile.name]));
        };

        oReader.readAsDataURL(oFile);
      });

      // Clear uploader for next selection
      oFileUploader.setValue("");
    },
    onCommonTokenDelete: function (oEvent) {
      // You may set these as data-* attributes on the Tokenizer or use fixed conventions
      var sModelName = "UploaderData";
      var sAttachmentPath = "/attachments";
      var sNamePath = "/name";
      var sUploadFlagPath = "/isFileUploaded";
      var oModel = this.getView().getModel(sModelName);
      var aAttachments = oModel.getProperty(sAttachmentPath) || [];
      // Support both single and multiple token deletion
      var oTokens = oEvent.getParameter("tokens") || [oEvent.getParameter("token")];
      oTokens.forEach(function (oToken) {
        var sFileName = oToken.getKey();
        aAttachments = aAttachments.filter(function (file) {
          return file.filename !== sFileName;
        });
      });
      oModel.setProperty(sAttachmentPath, aAttachments);
      var aNames = aAttachments.map(function (file) { return file.filename; });
      oModel.setProperty(sNamePath, aNames.join(", "));
      oModel.setProperty(sUploadFlagPath, aAttachments.length > 0);
    },

    async generateCertificatePDF(content, branchCode) {
      this.getBusyDialog(); // open BusyDialog immediately
      var oModel = this.getView().getModel("PDFData").getData();
      await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: branchCode });
      var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");
      if (!oCompanyDetailsModel.companylogo64 && !oCompanyDetailsModel.signature64 && !oCompanyDetailsModel.backgroundLogoBase64) {
        try {
          const logoBlob = new Blob([new Uint8Array(oCompanyDetailsModel.companylogo?.data)], { type: "image/png" });
          const signBlob = new Blob([new Uint8Array(oCompanyDetailsModel.signature?.data)], { type: "image/png" });
          const backgroundBlob = new Blob([new Uint8Array(oCompanyDetailsModel.backgroundLogo?.data)], { type: "image/png" });

          const [logoBase64, signBase64, backgroundBase64] = await Promise.all([
            this._convertBLOBToImage(logoBlob),
            this._convertBLOBToImage(signBlob),
            this._convertBLOBToImage(backgroundBlob)
          ]);

          oCompanyDetailsModel.companylogo64 = logoBase64;
          oCompanyDetailsModel.signature64 = signBase64;
          oCompanyDetailsModel.backgroundLogoBase64 = backgroundBase64;
        } catch (err) {
          console.error("Image compression failed:", err);
          this.closeBusyDialog();
        }
      }
      if (oCompanyDetailsModel.companylogo64 && oCompanyDetailsModel.signature64) {
        if (typeof jsPDF !== "undefined" && typeof jsPDF._GeneratePDF === "function") {
          jsPDF._GeneratePDF(this, content, oCompanyDetailsModel, oModel);
        }
      }
    },
    //common confirmation dialog box
    showConfirmationDialog: function (sTitle, sMessage, fnOnConfirm, fnOnCancel, sOkText, sCancelText) {
      var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

      var dialog = new sap.m.Dialog({
        title: sTitle,
        type: "Message",
        icon: "sap-icon://question-mark",
        content: new sap.m.Text({ text: sMessage }),
        beginButton: new sap.m.Button({
          text: sOkText || oResourceBundle.getText("OkButton"),
          type: "Accept",
          press: function () {
            dialog.close();

            // this.getBusyDialog(); // open BusyDialog immediately
            Promise.resolve()
              .then(function () {
                if (typeof fnOnConfirm === "function") {
                  return fnOnConfirm();
                }
              }.bind(this))
              .finally(function () {
                // this.closeBusyDialog(); // Always close BusyDialog
              }.bind(this));
          }.bind(this)
        }),
        endButton: new sap.m.Button({
          text: sCancelText || oResourceBundle.getText("CancelButton"),
          type: "Reject",
          press: function () {
            dialog.close();

            // this.getBusyDialog(); // open BusyDialog immediately
            Promise.resolve()
              .then(function () {
                if (typeof fnOnCancel === "function") {
                  return fnOnCancel();
                }
              }.bind(this))
              .finally(function () {
                // this.closeBusyDialog(); // Always close BusyDialog
              }.bind(this));
          }.bind(this)
        }),
        afterClose: function () {
          dialog.destroy();
        }
      });

      dialog.open();
    },

    _initMessagePopover: function () {
      var i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
      this.oMessagePopover = new sap.m.MessagePopover({
        items: [
          new sap.m.MessageItem({ type: "Information", title: "P - Present", description: i18n.getText("forP") }),
          new sap.m.MessageItem({ type: "Information", title: "A - Absent", description: i18n.getText("forA") }),
          new sap.m.MessageItem({ type: "Information", title: "H - Half-Day", description: i18n.getText("forH") }),
          new sap.m.MessageItem({ type: "Information", title: "LA - Late", description: i18n.getText("forLA") }),
          new sap.m.MessageItem({ type: "Information", title: "L - Leave", description: i18n.getText("forL") }),
          new sap.m.MessageItem({ type: "Information", title: "SP - Present on Sunday", description: i18n.getText("forSP") }),
          new sap.m.MessageItem({ type: "Information", title: "SA - Absent on Sunday", description: i18n.getText("forSA") }),
          new sap.m.MessageItem({ type: "Information", title: "SH - Half-Day on Sunday", description: i18n.getText("forSH") }),
          new sap.m.MessageItem({ type: "Information", title: "SLA - Late on Sunday", description: i18n.getText("forSLA") }),
          new sap.m.MessageItem({ type: "Information", title: "SL - Leave on Sunday", description: i18n.getText("forSL") })
        ]
      });
      this.getView().addDependent(this.oMessagePopover);
    },

    FST_onEnableImport: function () {
      var branch = this.byId("FST_id_FilterBranch");
      var date = this.byId("FST_id_MonthYearPicker");
      if (!branch.getValue() || !date.getValue()) {
        this.byId("FST_id_ImportBtn").setEnabled(false);
        this.byId("MP_id_GoBtn").setEnabled(false);
      }
      else {
        this.byId("FST_id_ImportBtn").setEnabled(true);
        this.byId("MP_id_GoBtn").setEnabled(true);
      }
    },

    updateDaysInColumns: function (pickerYear, pickerMonth) {
      var daysInMonth = new Date(pickerYear, pickerMonth, 0).getDate(); // Get number of days in the month
      for (var day = 1; day <= daysInMonth; day++) {
        var date = new Date(pickerYear, pickerMonth - 1, day); // JS months are 0-indexed
        var weekday = date.toLocaleString('en-US', { weekday: 'short' }); // e.g., Sun, Mon
        var text = day + "\n" + weekday;
        var columnId = "idDay" + day;
        var oColumnText = this.byId(columnId);
        if (oColumnText) {
          oColumnText.setText(text);
        }
      }
    },

    resetColumnHeaders: function () {
      for (var i = 1; i <= 31; i++) {
        var columnId = "idDay" + i;
        var oColumnText = this.byId(columnId);
        if (oColumnText) {
          oColumnText.setText(i.toString());
        }
      }
    },

    _commonGETCall: async function (sEntity, sModelName, oFilter) {
      try {
        var response = await this.ajaxReadWithJQuery(sEntity, oFilter);
        if (response.success) {
          this.oModel.setProperty("/" + sModelName, response.data || response.results);
        } else {
          console.error(response);
          sap.m.MessageToast.show(this.i18nModel.getText("msgFailedToFetch"));
        }
      }
      catch (e) {
        console.error(e);
      }
    },

    checkLoginModel: function () {
      if (!this.getView().getModel("LoginModel")) {
        sap.ui.core.BusyIndicator.hide();
        this.getRouter().navTo("RouteLoginPage");
      }
    },
    onClearAndSearch: function (sFilterBarId) {
      var oFilterBar = this.byId(sFilterBarId);
      if (oFilterBar) {
        oFilterBar.clear(); // Clear all filters in the FilterBar
      }
    },

    getBusyDialog: function () {
      if (!this._pBusyDialog) {
        this._pBusyDialog = sap.ui.core.Fragment.load({
          name: "sap.kt.com.minihrsolution.fragment.BusyIndicator",
          controller: this
        }).then(function (oBusyDialog) {
          this.getView().addDependent(oBusyDialog);
          return oBusyDialog;
        }.bind(this));
      }

      this._pBusyDialog.then(function (oBusyDialog) {
        this.oBusyDialog = oBusyDialog;
        this.oBusyDialog.open();

      }.bind(this));
    },

    closeBusyDialog: function () {
      if (this.oBusyDialog) {
        this.oBusyDialog.close();

      }
    },

    CommonVisitingCard: async function (EmployeeName, MobileNo, Email, Designation, branchCode) {
      const { jsPDF } = window.jspdf;
      this.getBusyDialog(); // open BusyDialog immediately

      try {
        await this._fetchCommonData("CompanyCodeDetails", "CompanyCodeDetailsModel", { branchCode: branchCode });
        var oCompanyDetailsModel = this.getView().getModel("CompanyCodeDetailsModel").getProperty("/0");

        const visitfrontBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.visitingCardFront?.data);
        const visitbackBase64 = this._convertBLOBtoBASE64(oCompanyDetailsModel.visitingCardBack?.data);
        const address = oCompanyDetailsModel.shortAddress;
        const companyurl = oCompanyDetailsModel.website;

        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: [50.8, 88.9] // 3.5 x 2 inches
        });

        // Add Front Background
        doc.addImage(visitfrontBase64, "JPEG", 0, 0, 88.9, 50.8);

        // Add Employee Info
        doc.setFontSize(12);
        doc.setTextColor("#FFFFFF");
        doc.setFont("times", "bold");
        doc.text(EmployeeName, 5, 8);

        doc.setFontSize(8);
        doc.setFont("times", "normal");
        doc.text(Designation, 5, 12);

        doc.setFontSize(6.5);
        doc.text(`+91 ${MobileNo}`, 13, 23);

        if (Email.length > 26) {
          const emailLines = doc.splitTextToSize(Email, 33);
          doc.text(emailLines, 13, 29.5);
        }
        else {
          doc.text(Email, 13, 30.5);
        }

        doc.setTextColor("#FFFFFF");
        doc.textWithLink(companyurl, 13, 38, { url: companyurl });

        const addressLines = doc.splitTextToSize(address, 43.5);
        doc.text(addressLines, 13, 44.5);

        // Add Back Page
        doc.addPage();
        doc.addImage(visitbackBase64, "JPEG", 0, 0, 88.9, 50.8);

        // Save PDF
        doc.save(`${EmployeeName}_VisitingCard.pdf`);
      } catch (error) {
        sap.m.MessageToast.show(error.message || error.responseText);
      } finally {
        this.closeBusyDialog();
      }
    },
    // Common salutaon and gender change code
    onSalutationChangeCommon: function (oEvent, sModelName, sGenderPropertyPath, sGenderControlId) {
      var selectedSalutation = oEvent.getSource().getSelectedKey();
      var oView = this.getView();
      var oModel = oView.getModel(sModelName);

      if (selectedSalutation === "Ms." || selectedSalutation === "Mrs.") {
        oModel.setProperty(sGenderPropertyPath, "Female");
        oView.byId(sGenderControlId).setEnabled(false);
      } else if (selectedSalutation === "Mr.") {
        oModel.setProperty(sGenderPropertyPath, "Male");
        oView.byId(sGenderControlId).setEnabled(false);
      } else {
        oView.byId(sGenderControlId).setEnabled(true);
      }
    },
    onCountryChange: function (oEvent, oIds) {
      const oSource = oEvent.getSource();
      const oSelectedItem = oSource.getSelectedItem();

      if (!oSelectedItem) {
        oSource.setValueState("None");
        return;
      }

      const sCountryCode = oSelectedItem.getAdditionalText();
      const oView = this.getView() || oSource.getParent();

      const getById = (sId) => oView.byId(sId) || sap.ui.getCore().byId(sId);

      // STD Code Logic
      const oSTDCombo = getById(oIds.stdCodeCombo);
      if (oSTDCombo?.getBinding("items")) {
        oSTDCombo.getBinding("items").filter([]);
        oSTDCombo.setValue("");

        setTimeout(() => {
          const aFilteredItems = oSTDCombo.getItems();
          const oMatch = aFilteredItems.find(item => item.getAdditionalText() === sCountryCode);
          if (oMatch) {
            oSTDCombo.setSelectedItem(oMatch);
            oSTDCombo.setValue(oMatch.getText());
            oSTDCombo.setValueState("None");
          }
        }, 100);
      }

      // Base Location Filtering
      const oBaseCombo = getById(oIds.baseLocationCombo);
      if (oBaseCombo?.getBinding("items")) {
        const oFilter = new sap.ui.model.Filter("CountryCode", sap.ui.model.FilterOperator.EQ, sCountryCode);
        oBaseCombo.getBinding("items").filter([oFilter]);
        oBaseCombo.setSelectedKey("");
        oBaseCombo.setValue("");
      }

      // Branch Code Clear
      const oBranchInput = getById(oIds.branchInput);
      if (oBranchInput) {
        oBranchInput.setValue("");
      }

      // Mobile Number Clear
      const oMobileInput = getById(oIds.mobileInput);
      if (oMobileInput) {
        oMobileInput.setValue("");
      }
    },
    handleBaseLocationChange: function (oEvent, sBaseLocationModelName, sTargetModelName, sTargetPath) {
      const sSelectedKey = oEvent.getSource().getSelectedKey();
      const oView = this.getView();
      const oBaseLocationModel = oView.getModel(sBaseLocationModelName);
      const aLocations = oBaseLocationModel.getData();

      const oSelectedLocation = aLocations.find(loc => loc.city === sSelectedKey);

      if (oSelectedLocation) {
        const oTargetModel = oView.getModel(sTargetModelName);
        oTargetModel.setProperty(sTargetPath, oSelectedLocation.branchCode);
      }
    },

    getFirstDayOfMonth: function (monthName, year) {
      // Define a lookup for month names
      var monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      // Get the index of the month (0-based)
      var monthIndex = monthNames.indexOf(monthName);

      // Validate input
      if (monthIndex === -1 || typeof year !== 'number') {
        console.error("Invalid month name or year");
        return null;
      }

      // Return new Date for first day of that month
      return new Date(year, monthIndex, 1);
    },

    //Common Convert number to words function
    convertNumberToWords: function (num, currency) {
      if (num === 0) return "Zero " + currency + " Only";

      const belowTwenty = [
        '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
        'Eighteen', 'Nineteen'
      ];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

      function helper(n) {
        if (n === 0) return '';
        else if (n < 20) return belowTwenty[n] + ' ';
        else if (n < 100) return tens[Math.floor(n / 10)] + ' ' + helper(n % 10);
        else return belowTwenty[Math.floor(n / 100)] + ' Hundred ' + helper(n % 100);
      }

      let result = '';
      let i = 0;

      let integerPart = Math.floor(num);
      let fractionalPart = Math.round((num - integerPart) * 100);

      while (integerPart > 0) {
        let divisor = i === 0 ? 1000 : 100;
        const remainder = integerPart % divisor;

        if (remainder !== 0) {
          result = helper(remainder) + thousands[i] + ' ' + result;
        }

        integerPart = Math.floor(integerPart / divisor);
        i++;
      }

      result = result.trim() + "${currency}";

      // Add fractional part (Paise/Cents)
      if (fractionalPart > 0) {
        result += " and " + helper(fractionalPart) + (currency === "INR" ? "Paise" : "Cents");
      }

      return result + " Only";
    },

    scrollToSection: function (pageId, sectionId) {
      var page = this.byId(pageId);
      if (page && sectionId) {
        page.scrollToSection(this.byId(sectionId).getId());
      }
    },
    //Variable pay function
    EOD_onVariablePayInfoPress: function (oEvent) {
      if (!this._oPopover) {
        this._oPopover = new sap.m.Popover({
          contentWidth: "400px",
          contentHeight: "auto",
          showHeader: false,
          placement: sap.m.PlacementType.Bottom,
          content: [
            new sap.m.VBox({
              alignItems: "Center",
              justifyContent: "Center",
              width: "100%",
              items: [
                new sap.m.Text({
                  text: this.i18nModel.getText("variablePayMsg"),
                  wrapping: true
                })
              ]
            }).addStyleClass("customPopoverContent")
          ]
        });
        this.getView().addDependent(this._oPopover);
      }
      this._oPopover.openBy(oEvent.getSource());
    },

  })
});