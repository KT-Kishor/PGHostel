sap.ui.define([
  "./BaseController",
  "../utils/validation",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "../model/formatter",
], function (
  BaseController, utils, JSONModel, MessageToast, Formatter
) {
  "use strict";

  return BaseController.extend("sap.kt.com.minihrsolution.controller.Invoice_Solution_Demo", {
    Formatter: Formatter,
    onInit: function () {

      this.getRouter().getRoute("Invoice_Solution_Demo").attachMatched(this._onRouteMatched, this);

      // Form Data
      var oFormData = new JSONModel({
        CustomerName: "",
        CompanyName: "",
        Email: "",
        Address: "",
        TimeSlot: "",
          stdCode: "+91",
        MobileNo: "",
        Comments: "",
      });
      this.getView().setModel(oFormData, "formData");

      // Load carousel videos etc. when route matches
      this._careerDataLoaded = false; // flag to avoid repeated fetch
    },
    _onRouteMatched: function () {
      this.i18nModel = this.getView().getModel("i18n").getResourceBundle();


      //   sessionStorage.removeItem("homePageReturnTab");
      this.API = "https://rest.kalpavrikshatechnologies.com";
    },
    onpresshome: function () {
      this.getOwnerComponent().getRouter().navTo("RouteHomePage");
    },
    onOpenForm: function () {
      if (!this._oDemoFormDialog) {
        this._oDemoFormDialog = sap.ui.xmlfragment(
          this.getView().getId(), "sap.kt.com.minihrsolution.fragment.NewDemoform",
          this
        );
        this.getView().addDependent(this._oDemoFormDialog);
      }
      this._oDemoFormDialog.open();
    },
    onCloseDemoForm: function () {
      if (this._oDemoFormDialog) {
        this._oDemoFormDialog.close();
      }
    },
    validateCompnayname: function (oEvent) {
      utils._LCvalidateMandatoryField(oEvent);
    },
    validateName: function (oEvent) {
      utils._LCvalidateName(oEvent);
    },
    validateMobileNo: function (oEvent) {
      utils._LCvalidateMobileNumber(oEvent);
    },
    validateEmail: function (oEvent) {
      utils._LCvalidateEmail(oEvent);
    },
    ValidateCommonFields: function (oEvent) {
      utils._LCvalidateMandatoryField(oEvent);
    },
     ValidateSTDFields: function (oEvent) {
          utils._LCstrictValidationComboBox(oEvent); 
        },
    onDemoformSave: function () {
      var that = this;
          var oModel = this.getView().getModel("formData");
          var oData = JSON.parse(JSON.stringify(oModel.getData())); // Deep copy to avoid reference issues
          var payload = [oData];

          // Form Validation
          if (
            utils._LCvalidateMandatoryField(this.byId("idCompanyname"), "ID") &&
            utils._LCvalidateName(this.byId("idcustomername"), "ID") &&
            utils._LCvalidateEmail(this.byId("idCustmailid"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("idtimeslot"), "ID") &&
                 utils._LCstrictValidationComboBox(this.byId("idDemoSTD"), "ID") &&
            utils._LCvalidateMobileNumber(this.byId("idmobilenumber"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("idCustaddress"), "ID") &&
            utils._LCvalidateMandatoryField(this.byId("idcomment"), "ID")
          ) {
            // AJAX Call to Save Data
            $.ajax({
              url: this.API + "/CustomerDemo",
              type: "POST",
              headers: {
                "Content-Type": "application/json",
                name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
                password:
                  "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
              },
              data: JSON.stringify(payload),
              success: function (response) {
                var resetData = {
                  CustomerName: "",
                  CompanyName: "",
                  Email: "",
                  Address: "",
                  TimeSlot: "",
                  MobileNo: "",
                  Comments: "",
                };

                oModel.setData(resetData);
                oModel.refresh(true);
             
            that._oDemoFormDialog.close();
          
             MessageToast.show("Thanks For Submitting the form. Our team will get back to you soon!");

                // AJAX Call to Send Email
              },
              error: function (xhr, status, error) {
                MessageToast.show("Error saving data. Please try again.");
              },
            });
          } else {
            MessageToast.show(this.i18nModel.getText("mandetoryFields"));
          }
        },
    onAfterRendering: function () {
      this._applyResponsiveVideo("videoBox11", "videoFrameHtml11", "../Videos/MSA and SOW Application.mp4");
      this._applyResponsiveVideo("videoBox21", "videoFrameHtml21", "../Videos/Manage Customer.mp4");
      this._applyResponsiveVideo("videoBox31", "videoFrameHtml31", "../Videos/Purchase Order.mp4");
      this._applyResponsiveVideo("videoBox41", "videoFrameHtml41", "../Videos/Company Invoice.mp4");
      this._applyResponsiveVideo("videoBox51", "videoFrameHtml51", "../Videos/Contractor Invoice Application.mp4");
      this._applyResponsiveVideo("videoBox61", "videoFrameHtml61", "../Videos/Quotation Application.mp4");

    },
    _applyResponsiveVideo: function (vBoxId, htmlId, videoUrl) {
    var oVBox = this.byId(vBoxId);
    var oHtml = this.byId(htmlId);
    if (!oVBox || !oHtml) return;

    var iWidth = window.innerWidth;
    var bResponsive = sap.ui.Device.system.phone || iWidth < 768; // treat <768px as mobile

    var bAutoplay = (vBoxId === "videoBox11");

    // Video tag (no background here)
    var sVideoTag = "<video id='" + htmlId + "_video' controls " +
        (bAutoplay ? "autoplay muted playsinline " : "") +
        "style='width:100%;height:100%;border:none;border-radius:15px;object-fit:contain;'>" +
        "<source src='" + videoUrl + "' type='video/mp4'>" +
        "</video>";

    // Wrapper with BACKGROUND on all 4 sides
    var sWrapper = bResponsive
        ? "<div style='position:relative;width:100%;padding-top:56.25%;overflow:hidden;border-radius:15px;background:#f3f3f3;'>" +
              "<div style='position:absolute;top:0;left:0;width:100%;height:100%;'>" +
                  sVideoTag +
              "</div>" +
          "</div>"
        : "<div style='width:560px;height:315px;overflow:hidden;border-radius:15px;background:#f3f3f3;'>" +
              sVideoTag +
          "</div>";

    oHtml.setContent(sWrapper);

    // Adjust fit after metadata is loaded
    setTimeout(function () {
        var videoEl = document.getElementById(htmlId + "_video");
        if (videoEl) {
            videoEl.addEventListener("loadedmetadata", function () {
                var vidRatio = videoEl.videoWidth / videoEl.videoHeight;
                var boxRatio = 560 / 315; // desktop ratio (16:9)

                if (bResponsive) {
                    videoEl.style.objectFit = "cover";
                } else {
                    if (Math.abs(vidRatio - boxRatio) < 0.1) {
                        videoEl.style.objectFit = "cover";
                    } else {
                        videoEl.style.objectFit = "contain"; // keep background visible on all 4 sides
                    }
                }
            });
        }
    }, 200);
},
  });
});