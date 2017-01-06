package sample.thumbnails;

import org.nuxeo.ecm.automation.core.Constants;
import org.nuxeo.ecm.automation.core.annotations.Context;
import org.nuxeo.ecm.automation.core.annotations.Operation;
import org.nuxeo.ecm.automation.core.annotations.OperationMethod;
import org.nuxeo.ecm.automation.core.annotations.Param;
import org.nuxeo.ecm.core.api.CoreSession;
import org.nuxeo.ecm.core.api.DocumentModel;
import org.nuxeo.ecm.core.api.DocumentModelList;
import org.nuxeo.ecm.core.blob.BlobManager;
import org.nuxeo.ecm.core.blob.BlobProvider;
import org.nuxeo.ecm.core.blob.binary.BinaryBlob;
import org.nuxeo.ecm.core.blob.binary.CachingBinaryManager;
import org.nuxeo.ecm.core.blob.binary.LazyBinary;
import org.nuxeo.runtime.api.Framework;

/**
 *
 */
@Operation(id = SetThumbnail.ID, category = Constants.CAT_DOCUMENT, label = "SetThumbnail", description = "Describe here what your operation does.")
public class SetThumbnail {

    public static final String ID = "Document.SetThumbnail";

    @Context
    protected CoreSession session;

    @Param(name = "originalFileDigest")
    protected String originalFileDigest;

    @Param(name = "thumbnailDigest")
    protected String thumbnailDigest;

    @OperationMethod
    public void run() {
        DocumentModelList docs = session.query(String.format("Select * from Document where content/data = '%s' ",
                originalFileDigest));

        // multiple documents
        for (DocumentModel doc : docs) {
            doc.addFacet("Thumbnail");

            BinaryBlob sb = new BinaryBlob(new LazyBinary(thumbnailDigest, "default", getCachingBinaryManager()),
                    thumbnailDigest, (String) doc.getPropertyValue("file:content/name"), "image/png", null,
                    thumbnailDigest, -1);

            doc.setPropertyValue("thumb:thumbnail", sb);
            session.saveDocument(doc);
        }

    }

    protected CachingBinaryManager getCachingBinaryManager() {
        BlobManager bm = Framework.getService(BlobManager.class);
        BlobProvider bp = bm.getBlobProvider("default");
        return (CachingBinaryManager) bp.getBinaryManager();
    }
}
